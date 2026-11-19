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

- A licença do perfil de Björn Jónsson usado nos anéis: RESOLVIDO em 19/11 (0532aa6d). A página do autor libera o uso sem permissão especial e pede a citação da origem; a ficha de Saturno ganhou a linha "o desenho" com o nome dele, nas duas línguas (texto lido guardado em `.cache/revisoes/licenca-jonsson/`).
- Conferência de 19/11, a pedido dele ("Sim, confira antes"): ensaio da publicação neste PC passou (lint, `data:verify`, 4.126 testes, build de 802 MB); seis telas do site construído olhadas (`capturas/ensaio-publicacao-19-11/prancha-site-construido.jpg`); os anéis gravados em movimento a 1× e a 1.000× (`aneis-girando.mp4`, `aneis-girando-rapido-v2.mp4`, sem pisca: maior salto de brilho entre quadros 0,4 em 255) e enviados a ele. ESPERA ELE: ver os dois vídeos, abrir no celular pela rede de casa (servidor `vite-lan`), e aceitar ou não Betelgeuse de perto como está.
- O que está em "não convence" acima, ou a decisão dele de publicar assim mesmo.
- As 14 cópias de trabalho da máquina antiga foram fechadas em 18/11 (*"Sim, arrume"*), com as provas que só existiam
  nelas guardadas antes em `capturas/copias/`. No GitHub saíram 22 ramos já aproveitados; na máquina antiga, 82.

## Os ramos no GitHub (arrumado em 18/11; ele não quer "um monte de coisa lá")

No GitHub há três ramos e só três: `main` (o site no ar), `backup` (o trabalho, à frente do site) e `tritao`
(trabalho a retomar). Não há pedido de junção aberto nem etiqueta. Na máquina antiga ficaram só `main` e `tritao`.
Ramo novo de trabalho, depois de juntado ou descartado, se apaga dos dois lados no mesmo dia.

- `tritao`: pausado por decisão dele em 04/10 (*"acho q tritao esta bom hj, vamos tomar cuidado para nao piorar"*),
  depois de ver a comparação (`capturas/tritao/olhar/prancha-comparacao-v1.jpg`): a receita ganhava na face
  fotografada e perdia no lado iluminado hoje (foto borrada com manchas de cor). Em 18/11 ele pediu que eu avaliasse
  se está mesmo no padrão. Minha avaliação, olhando o app (`capturas/tritao/olhar/tritao-hoje-18-11-contra-plutao.jpg`):
  NÃO está. Hoje é uma bola quase toda branca, com pouco para ver, cor redesenhada por IA e relevo emprestado das
  manchas da cor; ao lado de Plutão a diferença é clara. E a imagem de 04/10 não é a de hoje: o tom e a luz do app
  mudaram depois (09–13/10) e Tritão ficou mais branco (isto é leitura minha das duas imagens, não medi). O ramo é o
  ponto de partida da segunda tentativa: leitor dos relevos medidos com teste, plano com os fatos, e a ideia de
  tratar o lado borrado como nunca visto, que é o que a linha `completar-corpo` faz hoje. Os dados baixados ficaram
  em `.cache/tritao/` na máquina antiga. Ele respondeu *"Sim, na fila"* (18/11): é o próximo corpo, depois das
  duplicidades (item 230 das pendências). Este ramo deixa de ser registro e passa a ser trabalho a retomar.

Apagados em 18/11 com a palavra dele (*"pode apagar as seis gavetas e deixar só tritão"*), depois de relidos o
histórico e as conversas; eram registro de coisa decidida ou descartada, nenhum era pendência:
- `anamorfica` (423b5c08): duas candidatas da lente, item 233; ele escolheu *"Fica a de hoje"* (10/10). Prancha em
  `capturas/anamorfica-nova/`.
- `piloto-hiperion` (2500e3e2): as quatro versões do piloto; a quarta entrou no app em 23/09 por outro caminho.
- `faixa-do-disco` (4c2716f4): disco de Sgr A✱ de perfil como faixa macia; descartado em 14/11 (mais comprido e ~30 %
  mais caro). O risco na chegada a S2 se resolveu pela câmera 6° acima do disco (e73f1f0c).
- `saturno-chegada` (164237e7): candidatos `?anelb=a|b`; descartado em 14/11 (ganho pequeno). O conserto foi o brilho
  medido (cdf28ac0). Sobra a limpar: o interruptor `?anelb=0` continua no `main`; tirar na próxima rodada dos anéis.
- `claude/forja-lote3-tentativa` (db5d97aa) e `claude/forja-lote4-veu` (9e55a64e): dois rascunhos do passo do
  Grande Escurecimento dentro da Forja (região chapada; parte brilhante cinza). As lições estão no `PLAN-FORJA.md`.
As imagens das comparações ficam em `capturas/`, na máquina antiga. Os códigos entre parênteses são o último commit
de cada um, caso alguém precise procurar; depois de apagados, o GitHub não garante guardá-los.

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
