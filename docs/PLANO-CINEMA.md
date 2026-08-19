# Plano do cinema

Este é o único plano ativo dos filmes do **Mar de Estrelas**. Guarda decisões,
ordem e critérios de saída; não guarda conversas, pareceres ou diário. O Git
preserva a evolução. Quando uma fase vira produto, seus itens saem daqui e o
contrato duradouro fica no código ou no [`NORTE.md`](NORTE.md).

## Direção

**Tese:** *O universo não mudou. Nós mudamos de lugar.*

O filme galáctico atual vem primeiro. A perspectiva é seu eixo dramático: a
fila das Três Marias se desfaz, o Sol desaparece, a galáxia deixa de ser faixa
e passa a ser objeto, até casa virar um ponto. A ciência não interrompe esse
gesto; dá significado ao que a imagem acabou de revelar.

O segundo filme será uma viagem solar própria, de quatro minutos, passando por
Terra e Lua, Júpiter e Io, Saturno e suas luas, antes do afastamento em que o
Sol vira ponto. Os dois filmes viverão no mesmo Director e, depois da migração,
serão descritos pelo mesmo motor declarativo. Não haverá segundo aplicativo.

## Regras editoriais

- **A frente é a visão principal** (lei do dono, 19/08): em travessia, a
  câmera olha para onde vai — "os aviões não voam de lado". Traseira e
  laterais existem como acentos declarados e curtos, nunca como o normal.
  Órbita ao redor de um ASSUNTO olhando para ele não é voo de lado.
- **Tempo sem atividade não existe** (lei do dono, 19/08): trecho parado se
  encurta, se acelera ou ganha evento no caminho. Quietude só quando é a
  mensagem — e curta.
- Uma legenda, uma função: orientar, revelar, dimensionar ou concluir.
- A imagem mostra primeiro; o texto nomeia ou muda a leitura depois.
- Texto de tela fala com quem assiste. Parâmetros de implementação ficam no
  canal técnico.
- Afirmação científica precisa ser defensável e proporcional ao que a imagem
  realmente representa. Reconstrução não se apresenta como fotografia.
- **UA** no Sistema Solar; **anos-luz** na narrativa galáctica; **parsecs** no
  canal técnico.
- Legendas não se sobrepõem nem atravessam cortes, salvo uma ponte declarada e
  intencional. No filme atual, somente a legenda inicial do Sol tem esse passe.

## Restrições protegidas

O corte de 18/08 foi REPROVADO pela exibição do dono em 19/08 ("muito
enfadonho... minutos sem nada acontecer... feio viajar com a câmera de
lado"; palavras completas no item 54 do `PENDENCIAS.md`). A revisão de
ritmo tinha dito "manter" com curva de pixels — a lição: curva de pixels
não mede tédio; densidade de eventos e língua de câmera medem. O roteiro
será repensado 100%. O que fica de pé no repensar:

- a abertura (parede de fogo + hélice exponencial), cuja composição o dono
  aprovou e que só muda com comparação visual e novo aval dele;
- os dois QUADROS de medição (posição, mira, fov e roll exatos de perfil e
  face-on — `GATE_*` no `journey.ts`): o corte novo os mantém como holds em
  algum instante, e os TEMPOS novos atualizam testes e réguas no mesmo
  commit;
- as âncoras da história: casa → Órion → mergulho → Sagittarius A✱ →
  revelação → "você está aqui";
- 24 planos e 321 s NÃO são mais protegidos — o corte novo decide a duração
  pelos beats, sem tempo morto.

## Fila ativa

A cirurgia de texto foi o primeiro passo e é contrato do roteiro e de sua
auditoria. O trabalho segue nesta ordem:

1. **Roteiro novo (100%).** Primeiro o perfil analítico do corte atual,
   tirado do CÓDIGO (por segundo: velocidade da câmera, ângulo entre olhar
   e direção do voo, eventos em cena) — é ele que marca os trechos mortos e
   os voos de lado. Depois o desenho novo sob as duas leis do dono, com
   eventos reais no caminho (estrelas nomeadas perto da rota, com posição
   verdadeira). Conclui com typecheck, testes e juízes atualizados no mesmo
   commit, a varredura do `filme-ritmo.mjs` no corte novo, folhas para o
   dono — e a exibição DELE.
2. **Motor declarativo.** Movimentos nomeados, legendas, preload e marcadores
   de QA passam a ser dados leves do filme. Conclui quando o filme
   galáctico roda pelo novo formato sem diferença visual — prova A/B bit a
   bit, com o lado novo capturado de disco zerado — nem perda dos gates e
   um filme novo não exige editar o núcleo do aplicativo.
3. **Viagem solar.** Filme próprio de quatro minutos no mesmo motor. Conclui
   com Terra/Lua, Júpiter/Io, Saturno/luas e o afastamento final, ciência e
   unidades revisadas, gate visual e exibição completa aprovada.

Quando esta fila terminar, este arquivo pode desaparecer: o produto, os testes,
o `NORTE.md` e o histórico do Git serão as fontes de verdade.
