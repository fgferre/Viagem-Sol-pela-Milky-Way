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
não mede tédio; densidade de eventos e língua de câmera medem. O
repensar pousou em 19–20/08: 193 s, 25 planos e a coda com o gesto da
Lua (a história mora nos commits das datas; a exibição do dono é o item
54 do `PENDENCIAS.md`). **Juiz de play contínuo do segundo 0 ao 193 NÃO
existe** — é cegueira declarada no `NORTE.md`: `filme-ritmo.mjs` amostra
97 quadros parados e `filme-smoke.mjs` solta o relógio por 420 ms em sete
instantes; o filme inteiro segue julgado pelo olho do dono.
O que ficou de pé no repensar:

- a abertura (parede de fogo + hélice exponencial), cuja composição o dono
  aprovou e que só muda com comparação visual e novo aval dele;
- os dois QUADROS de medição (posição, mira, fov e roll exatos de perfil e
  face-on — `GATE_*` no `journey.ts`): o corte novo os mantém como holds em
  algum instante, e os TEMPOS novos atualizam testes e réguas no mesmo
  commit;
- as âncoras da história: casa → Órion → mergulho → Sagittarius A✱ →
  revelação → "você está aqui" → a volta para casa (coda: quinze
  segundos, um take Lua→Terra — a Lua de raspão com o olhar cedendo a
  ela no joelho e devolvendo à casa, do escuro ao claro);
- 24 planos e 321 s NÃO são mais protegidos — o corte novo decide a duração
  pelos beats, sem tempo morto.

## Fila ativa

O roteiro novo (perfil analítico, desenho sob as duas leis, juízes e
varredura) pousou em 19–20/08 e virou produto — a exibição do dono é o
item 54 do `PENDENCIAS.md`. O trabalho segue nesta ordem:

1. **Motor declarativo.** A decisão e as palavras do dono moram no **item 75
   do `PENDENCIAS.md`** — é ele o dono deste assunto; aqui fica só o critério
   técnico de saída. Movimentos nomeados, legendas, preload e marcadores de QA
   passam a ser dados leves do filme — e, por decisão dele em 24/08, também os
   **nomes em cena**: o roteiro DIRIGE, não desliga. O que o beat declara
   assume a frente da tela; a régua de relevância segue viva por baixo,
   governando o que o roteiro não fala (os nomes de fundo); e o modo pode ser
   escolhido manualmente por quem assiste — o dirigido é o padrão do filme,
   não uma prisão. (O mundo continua um só: órbitas, luz e física não mudam
   por modo; isto é direção declarada, não segundo universo.) O caso de prova
   é o ALNILAM do item 82 — a Três Marias do meio que perdeu o nome: o motor
   só está certo quando as três falarem. Conclui quando o filme galáctico roda
   pelo novo formato sem diferença visual — prova A/B bit a bit, com o lado
   novo capturado de disco zerado — nem perda dos gates, e um filme novo não
   exige editar o núcleo do aplicativo.
2. **Viagem solar.** Filme próprio de quatro minutos no mesmo motor. Conclui
   com Terra/Lua, Júpiter/Io, Saturno/luas e o afastamento final, ciência e
   unidades revisadas, gate visual e exibição completa aprovada.

Quando esta fila terminar, este arquivo pode desaparecer: o produto, os testes,
o contrato de autoria, o `NORTE.md` e o histórico do Git serão as fontes de verdade.

## Autoria disponível: sequência de planos

O exemplo vivo é [`cinturao.json`](../src/three/cinematic/roteiros/cinturao.json):
**AS TRÊS MARIAS** e **UM PASSO AO LADO**, com câmera e edição juntas.
`lerSequencia` lê `{ "planos": [...] }` e `journey.ts` encaixa a lista no
filme existente. A ordem da lista é a ordem das cenas; duração, cortes,
legendas e marcas da barra continuam calculados pelo relógio de `Journey`.
Não se digitam tempos absolutos nem se cria outra linha do tempo.

Cada entrada tem `camera`, descrita abaixo, e estes campos opcionais:

| Campo | Significado |
|---|---|
| `legendas` | Lista de janelas: `em` (fração do plano, de 0 até antes de 1), `texto`, `subtexto` opcional, `duracao` opcional em segundos de viagem (padrão 8,6), `ponte` opcional (padrão false) |
| `assuntos` | Nomes de estrelas do HYG, ou `SOL` / `SGR`, entregues à direção de etiquetas existente |
| `fundoSilencioso` | `true` silencia as etiquetas de fundo; omitido, continua false |
| `destino` | Nome para a linha de rumo com distância viva |
| `olhar` | Declara a língua do plano: `frente` (padrão), `assunto` ou `tras`; a orientação efetiva continua definida por `camera.mira` |

`legendas.em` usa a fração do **tempo de relógio**, independente do ritmo
do movimento. Uma janela é aberta na entrada e fechada no fim; buscar
um instante ou voltar pela barra mostra o mesmo texto que assistir até lá.
`ponte: true` declara a intenção de atravessar o corte — não altera a
duração. O leitor valida formato e faixas, mas não conserta edição:
`auditarRoteiro` e os testes editoriais existentes cobram sobreposições
e travessias sem ponte. A última legenda pode continuar além do fim do filme.

Para escrever outra sequência, copie a estrutura do exemplo, escolha
os movimentos já disponíveis e forneça os pontos nomeados na chamada
de `lerSequencia`. A montagem copia os dados, não acompanha alterações
posteriores no objeto original. Remover ou acrescentar planos recalcula
os horários dos seguintes e os capítulos da barra automaticamente.

### Câmera de cada plano

`lerPlanoDeCamera` lê dados JSON e devolve as peças que `Journey.at` já usa.
O segundo `camera` de `cinturao.json` é o antigo piloto `passoAoLado.json`,
agora junto da edição e do plano anterior, sem cópia paralela.
`journey.ts` fornece seus pontos nomeados (`mirante`, `desvio`, `Alnilam`).
Alterar esse objeto altera a câmera e a duração daquele trecho.

Campos obrigatórios: `duracao` em segundos, `movimento`, `mira` e `lente`
como `[início, fim]` em graus de campo vertical. A duração é positiva;
os dois valores da lente ficam estritamente entre 0° e 180°.

Todo ponto pode ser `[x, y, z]` em **parsecs no referencial da cena**, ou o
nome de um vetor fornecido no segundo argumento de `lerPlanoDeCamera`.
O leitor copia os pontos na montagem: um nome não é acompanhamento de um
corpo em movimento. Não copie coordenadas científicas para o JSON quando
o filme já calcula a âncora; passe o nome e a âncora existente.

| Campo | `tipo` | Parâmetros |
|---|---|---|
| `movimento` | `fixo` | `ponto` |
| `movimento` | `reta` | `de`, `para` |
| `movimento` | `curva` | `de`, `controle1`, `controle2`, `para` — Bézier cúbica |
| `movimento` | `orbita` | `centro`; pares `raio`, `angulo`, `altura`, do início ao fim. Raios não negativos em pc, ângulos em **radianos**, altura em pc ao longo do polo galáctico |
| `mira` | `fixo` | `ponto` |
| `mira` | `pan` | `de`, `para`; `ritmo` opcional, padrão `smooth` |
| `mira` | `pan-cedo` | `de`, `para`, `ate` — interpola pontos, chega cedo e segura |
| `mira` | `pan-direcao` | `de`, `para`, `ate` — interpola direções a partir da câmera em movimento; use perto de um alvo |
| `mira` | `passagem` | `de`, `assunto`, `rumo`, `entrada`, `saida` — olhar que acompanha o assunto e depois entrega o rumo seguinte |

`ate`, `entrada` e `saida` são frações entre 0 (exclusivo) e 1; `saida`
nunca vem antes de `entrada`. São frações do **movimento já suavizado**,
como nas primitivas existentes, não segundos de relógio.

`ritmo` e `ritmoDaLente` são opcionais no plano. Os nomes disponíveis são
`linear`, `smooth`, `easeOut`, `glide`, `launch`, `settle`, `settleFreeze`
(as funções de `movimentos.ts`). Sem `ritmo`, a câmera usa `glide`; sem
`ritmoDaLente`, a lente acompanha o ritmo do movimento. Separá-los permite
aproximação e zoom com tempos diferentes, sem fórmulas no JSON.

Nomes desconhecidos, números não finitos e parâmetros fora dessas faixas
interrompem a montagem com o campo indicado no erro. Não há `eval`, código
embutido no roteiro, dependência nova nem controle novo para o visitante.

**Limite desta base:** só a sequência do cinturão foi convertida; o motor
para um filme completo ainda não terminou. Preload, marcadores de QA,
inclinação e efeitos ainda não são lidos do JSON. `assuntos` transporta
os nomes para a regra atual, mas não resolve a direção de etiquetas do
item 82 — as três precisam falar juntas. Esses recursos e os movimentos
específicos que faltam vêm antes da migração integral e do A/B de disco
zerado. Validação focal:
`npx vitest run src/three/cinematic/lerSequencia.test.ts src/three/cinematic/lerPlanoDeCamera.test.ts`.
