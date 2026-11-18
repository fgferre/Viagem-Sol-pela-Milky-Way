# Passagem da coordenação para outra máquina e outra conversa (18/11/2026)

Quem lê: a conversa que vai coordenar o projeto daqui em diante. A coordenadora anterior (de 12 a 18/11) fechou
por mudança de máquina. Este arquivo é o mapa do que ela tinha na cabeça e que não cabe no bastão. Leia inteiro uma
vez; depois o trabalho de cada frente está no plano da frente. Apague este arquivo quando tudo abaixo tiver virado
commit, linha de plano ou resposta do dono.

## Como a rodada estava organizada

- Uma conversa coordenadora (modelo principal): decide, escreve os briefs, confere prancha, diff e testes, junta ao
  `main` local, fala com o dono. Não produz.
- Produção em conversas dedicadas (Opus), uma por frente, cada uma na sua cópia de trabalho, em arquivos que não se
  tocam. Elas param e mandam a proposta ANTES de fundir ou apagar. Trabalhadores: Opus onde há julgamento, Sonnet
  para tarefa fechada, Haiku para ler. As conversas antigas (ids `local_…` citados em planos e memória) não existem
  na máquina nova: abrir conversas novas a partir do plano de cada frente.
- Juntar: `git merge --ff-only` do ramo conferido, `npm run done` no conjunto, `git push origin main:backup`.
- O pedido em vigor (17/11): *"não vamos deixar esse problema se perpetuar, já que identificou-se coordene as
  resoluções"* — as duplicidades achadas no inventário (topo do `PLAN-FORJA.md`, "Inventário de 17/11").

## Onde cada frente parou

| Frente | Estado em 18/11 | Onde está escrito |
|---|---|---|
| Estrelas (Star Forge) | Lote 2 no `main`: mancha do Sol e região de Betelgeuse num botão só; Grande Escurecimento como véu de poeira. Custou cinco voltas. | `PLAN-FORJA.md` |
| Anéis de Saturno | Descrição única, giro com o relógio, câmera da vista "Anéis" consertada. De perto ficou ~2,6 ms mais pesado no nível cinema; ele aceitou (*"Sim, entra agora"*). | `PLAN-ANEIS.md` |
| Galáxia | Partículas (WebGPU com reserva) é o padrão. Próxima duplicidade: três motores; ver se a "clássica" ainda serve. Perguntei se sigo; ele não respondeu (mudou de máquina). | `PLAN-GALAXIA.md` |
| Ponto de luz | Quatro desenhistas para a mesma coisa. Não iniciado. Depois da galáxia. | inventário no `PLAN-FORJA.md` |
| Ruído em GLSL | 12+ cópias; só fundir as idênticas, sem mudar imagem. Último da fila. | idem |
| Peso do app | Primeira leva no ar (18/10). Próxima: bloom e galáxia de fora. | `PLAN-PESO.md` |
| Filmes | Roteiro, tomadas e motor; não gravar filme inteiro para conferir. | `PLAN-FILME-ESTELAR.md` |
| Poeira do Gaia | Ramo `poeira-gaia`, por marcos aprovados por foto. | `PLAN.md` |

## O que eu disse a ele que não convence (ele sabe; não esconder de novo)

- Betelgeuse de perto: a célula quente sai estourada e creme; há ~50 pontinhos cinza-azulados sob o véu; o pico de
  brilho norte/sul de dezembro dá 8× no desenho contra mais de 10× medido; o lugar da célula quente é posto quando a
  estrela nasce e não acompanha mudança de data com ela na tela. Tudo isso é da rampa de cor (o "instrumento").
- Anéis: um corte raro no pico de densidade; os quadradinhos claros (Passo 3) não começaram; o tremor das esteiras
  com a câmera andando não foi medido.
- De voltas anteriores, mostrado e SEM resposta dele: halo rosa de Rigel e Deneb, miolo azul-claro das estrelas
  quentes, Régulo de lado, Deneb de perto, Achernar de cima, a companheira de Capella branca.

## O que prometi e não cumpri

- Ver o giro dos anéis em movimento com meus olhos (só vi fotos seguidas).
- Conferir tudo no celular e nos níveis baixos de qualidade.
- Abrir o app nas estrelas novas, uma a uma.
- Uma rodada só de dados, com comando dele: números do Gaia, giro das estrelas (ζ Puppis 1,78 d), a curva de brilho
  de Betelgeuse; a poeira da galáxia em blocos sobre Saturno.

## Antes de publicar (publicar só com a palavra dele; ele disse *"ainda não"*)

- A licença do perfil de Björn Jónsson usado nos anéis.
- O que está em "não convence" acima, ou a decisão dele de publicar assim mesmo.
- Na máquina antiga ficaram 13 cópias de trabalho em `.claude/worktrees/` e `../Viagem-aneis-de-perto`, sem fechar.
  Todo commit delas está no GitHub. Apagar pede a palavra dele; as provas vão antes para `capturas/copias/`.

## Os ramos no GitHub (conferido em 18/11; ele não quer "um monte de coisa lá")

Só três tipos têm razão de existir: `main` (o site no ar), `backup` (o trabalho, à frente do site) e os sete ramos
abaixo, que guardam trabalho que NÃO entrou. Todo o resto estava inteiro dentro do `main` local. Não há pedido de
junção aberto nem etiqueta. Ramo novo de trabalho, depois de juntado, se apaga dos dois lados no mesmo dia.

- `anamorfica`: candidatas A e B da lente anamórfica, item 233, sem decisão dele.
- `faixa-do-disco`: disco de Sgr A✱ visto de perfil como faixa macia; prova não mostrada a ele (no `BACKLOG.md`).
- `saturno-chegada`: prova `?anelb=a|b` do anel B chapado na chegada (no `BACKLOG.md`).
- `piloto-hiperion`: as quatro versões do piloto; a quarta entrou no app por outro caminho. Fica como registro.
- `tritao`: pausado por decisão dele (*"deixar como está"*).
- `claude/forja-lote3-tentativa`, `claude/forja-lote4-veu`: tentativas recusadas de Betelgeuse. Só para consulta.

## Decisões dele nesta rodada que não mudam

- As duas frases antigas de espessura dos anéis: *"Deixe como está"*. Não mexer, não perguntar de novo.
- Mapa gerado do código e servidor de linguagem: propostos por mim e retirados por mim; ele perguntou se era "só mais
  layers". O que vale é o inventário antes de cada brief.
- Nada inventado para uma tomada; o mundo anda com o relógio e não depende da câmera; o universo é um só (sem desenho
  diferente por modo); "aprovado" não é régua, a régua é a referência real; nada some sem ser dito.

## Lições de método desta rodada (minhas)

- Em obra visual, fechar o que já convence antes de pedir mais: cada exigência nova a Betelgeuse abriu um defeito.
- Todo brief começa pelo inventário: o que no projeto já desenha esta mesma coisa física, em qualquer corpo?
- Com a máquina carregada, custo só se mede pareado e alternado (mediana das diferenças).
- Relato de trabalhador que roda comando em segundo plano chega parcial: ler o registro eu mesma.

## O que não veio

A conversa da coordenadora, inteira em texto (o que ele disse e o que respondi), está no repositório privado dele
`mar-de-estrelas-memoria`, pasta `conversas/`. É arquivo para busca quando faltar um detalhe, não leitura de entrada.
As provas em imagem (`capturas/`), o dado bruto (`.cache/`) e os estudos ficaram na máquina antiga.
