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
- nenhuma retemporização antes de uma exibição completa com o som novo.

## Fila ativa

A cirurgia de texto foi o primeiro passo e agora é contrato do roteiro e de
sua auditoria. O trabalho restante segue nesta ordem:

1. **Som procedural por ato.** Deve nascer de gesto do usuário, respeitar
   `?mute=1`, ter continuidade entre planos e poder ser desligado sem mudar a
   imagem. Conclui com audição integral, teste do mute e nenhuma reprodução
   automática indevida.
2. **Revisão de ritmo.** Assistir aos 321 segundos com som e decidir por imagem
   e ouvido se hélice e ondas ainda pedem tempo. Conclui com decisão explícita:
   manter o corte ou redistribuir segundos sem mudar total, quatro atos,
   abertura protegida e holds.
3. **Motor declarativo.** Movimentos nomeados, legendas, som, preload e
   marcadores de QA passam a ser dados leves do filme. Conclui quando o filme
   galáctico roda pelo novo formato sem diferença visual nem perda dos gates e
   um filme novo não exige editar o núcleo do aplicativo.
4. **Viagem solar.** Filme próprio de quatro minutos no mesmo motor. Conclui
   com Terra/Lua, Júpiter/Io, Saturno/luas e o afastamento final, ciência e
   unidades revisadas, som, gate visual e exibição completa aprovada.

Quando esta fila terminar, este arquivo pode desaparecer: o produto, os testes,
o `NORTE.md` e o histórico do Git serão as fontes de verdade.
