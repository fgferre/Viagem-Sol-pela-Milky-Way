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

## Restrições protegidas do filme atual

- quatro atos, 24 planos e duração total de 321 segundos;
- câmera, trajetórias e enquadramentos existentes;
- abertura, cuja composição só muda depois de comparação visual e aprovação do
  dono;
- holds de medição em `t=261` e `t=293`;
- o corte de 18/08 está DECIDIDO: a revisão de ritmo (exibição completa por
  `filme-ritmo.mjs`, 161 quadros + curva de movimento) manteve todos os
  segundos — hélice e ondas sustentam; vales e picos caem onde o desenho
  manda. Único ponto em observação: a calmaria dupla em t≈110–127 (vazio de
  CASA + início escuro da virada a Antares), que só se mexe se o dono a
  sentir na exibição dele.

## Fila ativa

A cirurgia de texto foi o primeiro passo e agora é contrato do roteiro e de
sua auditoria. A revisão de ritmo concluiu em 18/08 (decisão: manter o corte
— registrada nas restrições acima; o instrumento é
`scripts/visual/filme-ritmo.mjs` e serve de novo quando um corte mudar). O
trabalho restante segue nesta ordem:

1. **Motor declarativo.** Movimentos nomeados, legendas, preload e marcadores
   de QA passam a ser dados leves do filme. Conclui quando o filme
   galáctico roda pelo novo formato sem diferença visual — prova A/B bit a
   bit, com o lado novo capturado de disco zerado — nem perda dos gates e
   um filme novo não exige editar o núcleo do aplicativo.
2. **Viagem solar.** Filme próprio de quatro minutos no mesmo motor. Conclui
   com Terra/Lua, Júpiter/Io, Saturno/luas e o afastamento final, ciência e
   unidades revisadas, gate visual e exibição completa aprovada.

Quando esta fila terminar, este arquivo pode desaparecer: o produto, os testes,
o `NORTE.md` e o histórico do Git serão as fontes de verdade.
