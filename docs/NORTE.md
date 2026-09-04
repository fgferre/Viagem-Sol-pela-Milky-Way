# Norte

Lista das decisões de produto ainda em vigor que não moram no código — o
que virou código sai daqui; o que é narrativa, estado ou plano de etapas
também. Versão completa antes do corte de 04/09/2026: `git show
923dc20:docs/NORTE.md` (e `git show 923dc20:docs/PLANO-ATLAS.md`, `git show
923dc20:docs/PLANO-CINEMA.md`).

O que está aberto e incomoda quem usa mora em
[`docs/PENDENCIAS.md`](PENDENCIAS.md). Como uma estrela é desenhada mora em
[`docs/LEI-DA-ESTRELA.md`](LEI-DA-ESTRELA.md).
## Direção
- Uma Via Láctea volumétrica, cinematográfica e cientificamente
  fundamentada, viajável até qualquer ponto; perto de casa vive o
  **Atlas**, o sistema solar explorável, no mesmo Director. *A jornada te
  leva; o Atlas te deixa ficar.* Um produto só, dois modos — nunca dois
  motores.
- **"Mais que um SpaceEngine"** (dono, 11/08): a galáxia volumétrica
  cientificamente fundamentada é o diferencial; toda escala artística nova
  se declara no selo. Só reabre por decisão do dono, nunca por
  conveniência técnica.
- Unidades contam a história: **UA** no Sistema Solar, **anos-luz** na
  narrativa galáctica, **parsecs** só no canal técnico — nunca aparece
  para o visitante.
- O árbitro visual nunca é captura do próprio app: são as referências em
  `docs/reference/` (alvos em `VISUAL_TARGETS.md`, ledger em `EVOLUCAO.md`).
## Escala e honestidade
- Regra de escala, testável: quem tapa o que está atrás (escreve
  profundidade) tem raio físico real; quem só brilha por cima pode ter
  tamanho de instrumento — e se declara no selo.
- Proibido: teto de brilho. Proibido: exposição que dependa do que está
  em foco — a pupila adaptativa está reprovada pelo dono (era a causa da
  tela branca). O céu e a galáxia nunca esmaecem. Compressão **fixa** na
  emissão é o contrato (`LEI-DA-ESTRELA.md` §7).
- Dois relógios do Sol, nunca um pendurado no outro: o RÁPIDO é tempo de
  tela (para fora de quadro); o LENTO é a data simulada (calendário,
  nunca acumula). Confundi-los já congelou o Sol duas vezes.
## Luz e estrela
- Ponto (céu) e globo (visita) obedecem leis DIFERENTES, por decisão do
  dono: o ponto segue irradiância pura — é onde a ordem verdadeira de
  brilho se lê; o globo visitado tem exposição própria da visita (Saturno
  visitado fica tão claro quanto a Terra visitada, de propósito). Nunca
  "ganho = 1 seco em toda parte": a lei do ponto continua viva.
- O clarão do Sol é **um número só** no app inteiro (teto 0,07) — não
  volta a distinguir por modo (filme/Atlas/voo livre). Decisão final do
  dono, 24/08, depois de ver a foto e reprovar o tamanho.
- A luz assistida é o mesmo algoritmo do NASA Eyes; o modo `real` mantém
  a penumbra física verdadeira (Saturno mais escuro que a Terra) — quando
  um relatório de terceiro e uma decisão do dono discordam, vence a
  decisão, e a discordância fica escrita nos dois lugares (`luz.ts`).
- Sagittarius A* segue 125.884× maior que o real — segundo mentiroso de
  escala, dívida aberta (item 13 do PENDENCIAS). Generalização de
  comportamento estelar tem de aparecer no selo também.
## Atlas e câmera
- O código do atlas-orbital é **especificação do problema, não
  fornecedor da solução**: dados e oráculos (efemérides, IAU, fixtures,
  testes) migram verbatim; ferramentas offline julgadas por oráculo podem
  migrar; runtime e UI renascem. Uma linha de runtime só diz "Migra" com
  duas provas — qualidade medida com o arquivo aberto e revisão de olhos
  frescos na hora da travessia. Reescrever o que um oráculo externo já
  protege adiciona risco sem ganho.
- **O Atlas é o modo único; a viagem (filme) é uma ferramenta dele** —
  decisão do dono, 22-23/08: *"o atlas e a viagem são 2 coisas quase
  concorrentes... para mim o filme é um feature do atlas"*. Não é segundo
  universo. O portal leva a câmera nos dois sentidos e pousa na pose
  exata.
- **A lente é uma só na casa inteira — 58°** (era 35°), decisão do dono
  medida por A/B (25-29/08): brilho e lente por modo são proibidos.
- **A vista de abertura é o sistema inteiro, estilo NASA Eyes** — decisão
  do dono, 29/08. O Atlas herda o look do filme; diferença de desenho
  entre os dois modos é defeito, não estilo.
- Um relógio só (`jd` do Director) governa luz, rotação, nuvens e eclipse;
  dentro do filme o relógio é do filme, no Atlas é do visitante — a
  fronteira é preço declarado, não bug.
## Filme
- Tese: *o universo não mudou; nós mudamos de lugar.* O filme galáctico
  (193 s, 25 planos) vem primeiro; um segundo filme solar de 4 min
  (Terra/Lua, Júpiter/Io, Saturno/luas, afastamento) está na fila — item
  210 do PENDENCIAS.
- A abertura (parede de fogo + hélice exponencial) só muda com nova
  comparação visual e aval do dono — composição já aprovada. Filmes são
  roteiro (JSON) lido por um motor declarativo único, nunca reescrita do
  núcleo do app (`src/three/cinematic/`).
## UI e URL
- Nada no painel recarrega a página; **detecção nunca decide, medição
  sugere, o visitante escolhe**. Sem `?q=` o tier é constante (cinema); a
  URL espelha a ESCOLHA, nunca o tier vivo do Auto.
- Camadas moram na GAVETA, e só nela — não duplicar em Ajustes. Decisão
  do dono, 22/08: *"vários elementos que hj estão em ajustes na verdade
  deveriam ser camadas?"*
- As gavetas do HUD são um enum; uma abre por vez (exceções escritas: o
  Ajustes é o painel da casa, a Ficha segue a seleção, não a fase).
- O celular é uma faixa declarada (`LARGURA_DO_CELULAR_PX`, TypeScript) —
  nunca um número solto repetido em CSS.
- Rede de terceiros (Wikipedia ou qualquer outra) só entra com opt-out
  verificável.
## O que não se repete
- Onze peças do doador, aposentadas — não ressuscitar: HYG 4 tiers
  binários; `StellarFlightTransition`; presets + score aditivo +
  overrides; Exposição manual / Camera FX / LoD do doador; `qualityMode`
  legado; Debug Logging do doador; Colorblind/High Contrast (cor é o
  dado, não filtro); Modo Superfície 1ª pessoa; `.txt` de sessão;
  README/HANDOFF do doador; os dois estudos reprovados na Onda 0.
- Anti-padrões do doador, não copiar: lei física em duas camadas que não
  se conhecem; controle de qualidade cabeado a subsistema inerte;
  subsistema caro cuja saída é constante no caso comum; guarda armada por
  condição que não bate com o pipeline; selo que não cobre todos os
  caminhos que alteram o resultado; cache por relógio de parede para
  tempo de simulação; uma constante com dois papéis; exposição
  fragmentada sem dono; expoente de display calibrado para compensar
  outro parâmetro não co-desenhado. De UI: painel de debug promovido a
  produto; escada de valores à mão; i18n prometida e não cumprida;
  ferramenta de dev no produto; estética sci-fi que não é a da casa.
- Becos sem saída, já medidos e refutados — não repetir: verificador
  automático de prosa (removido pelo dono no mesmo dia); subir contraste
  dos braços da galáxia; desacoplar a fase da poeira da fase da luz; cor
  do disco decidida por raio; pesar H II para subir o púrpura; véu
  aditivo no caminho de extinção; escurecer glow/partículas para o edge;
  halo acima de 0,4 sob `forgetau`; teto de brilho para a tela branca;
  copiar a exposição do projeto irmão; apagar `aFocus` como peso morto.
