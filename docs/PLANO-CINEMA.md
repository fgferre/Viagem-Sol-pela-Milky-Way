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

Um exemplo vivo é [`cinturao.json`](../src/three/cinematic/roteiros/cinturao.json):
**A BOLHA LOCAL**, **AS TRÊS MARIAS** e **UM PASSO AO LADO**, com câmera
e edição juntas. O corredor da Bolha declara inclinação e pulso; o
passo lateral usa um trajeto curvo por pontos. O
[`orion.json`](../src/three/cinematic/roteiros/orion.json) reúne a
chegada e a órbita de Betelgeuse, o raspão de Rigel e a dobradiça CASA.
O [`mergulho.json`](../src/three/cinematic/roteiros/mergulho.json) abre
com a virada para Antares e contém o lançamento, as travessias de
Sagitário e Scutum e a frenagem antes do centro, com rampas e pulsos de
velocidade. A
[`abertura.json`](../src/three/cinematic/roteiros/abertura.json) reúne a
parede solar, a saída em hélice e a passagem por Sirius. O
[`revelacao.json`](../src/three/cinematic/roteiros/revelacao.json) reúne
os holds de medição do Ato IV (perfil e face) e a travessia que abre o
disco em braços, com os marcos `edge`/`face` declarados nos próprios
planos.
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
| `preload` | Preparação a partir do início do plano: `corpos` (lista de IDs do palco) e/ou `efemerides: true` |
| `qa` | Objeto com nomes únicos de conferência e suas frações de tempo no plano, por exemplo `{ "paralaxe": 0.5 }` |

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

### Preparação e pontos de conferência

`preload` é uma intenção, não uma URL nem uma chamada de rede no roteiro.
`corpos` usa os IDs que `montarCorposDoPalco` registra (`earth`, `moon`,
`mars` etc.); o leitor valida o formato, não a existência do ID no palco.
`efemerides: true` pede a fonte de posições antes de ela aparecer em cena.
Os pedidos se acumulam desde o início de cada plano; repetir um corpo
não adia seu primeiro pedido. Buscar um instante à frente ou voltar
pela barra consulta o tempo atual, sem depender do histórico de play.
Isso não força descarte de textura ao voltar: o carregador existente
continua dono da residência e do gate de tamanho.

`qa` usa frações de relógio entre 0 e 1 (exclusivo), não o ritmo suavizado
da câmera. Nome repetido no filme ou consulta a marco ausente é erro.
`montarApoiosDoRoteiro` recebe os mesmos inícios dos planos que `Journey`
já calculou; `APOIOS_DO_FILME.instanteDeQA(nome)` devolve o segundo
correspondente, para usar com a porta existente `?t=…&shot=1`.
Não há controle novo para o visitante. `CAPTURE_T` continua arredondando
os marcos `edge` e `face` ao segundo inteiro, como os juízes antigos.

O exemplo do cinturão já declara `cinturao` e `paralaxe`; os holds do
Ato IV declaram `edge` e `face` no `revelacao.json`. O apoio do plano
ainda não convertido (a fuga) vem de
[`apoiosDaViagem.json`](../src/three/cinematic/roteiros/apoiosDaViagem.json):
Terra, Lua e efemérides no estilingue. `lerApoiosDoPlano` lê esses
mesmos campos, sem outro formato. Ao converter essa câmera, o apoio
passa para o plano no JSON; não se mantém uma cópia paralela.

### Câmera de cada plano

`lerPlanoDeCamera` lê dados JSON e devolve as peças que `Journey.at` já usa.
`journey.ts` fornece seus pontos nomeados (`saidaDeSirius`, `mirante`,
`desvio`, `Alnilam`).
Alterar a entrada `camera` de cada plano altera a câmera e a duração
daquele trecho.

Campos obrigatórios: `duracao` em segundos, `movimento`, `mira` e `lente`
como `[início, fim]` em graus de campo vertical. A duração é positiva;
os dois valores da lente ficam estritamente entre 0° e 180°.

Todo ponto pode ser `[x, y, z]` em **parsecs no referencial da cena**, ou o
nome de um vetor fornecido no segundo argumento de `lerPlanoDeCamera`.
O leitor copia os pontos na montagem: um nome não é acompanhamento de um
corpo em movimento. Não copie coordenadas científicas para o JSON quando
o filme já calcula a âncora; passe o nome e a âncora existente.

Os campos numéricos de `camera` também aceitam nomes fornecidos no
terceiro argumento de `lerSequencia` ou `lerPlanoDeCamera`.
Exemplo: `distancia: ["distanciaInicial", "distanciaFinal"]` recebe
`{ distanciaInicial: D_ABERTURA_PC, distanciaFinal: D_SAIDA_PC }`.
As distâncias continuam calculadas no filme, sem copiar a calibração
solar para o JSON. Os números são copiados e validados na montagem;
não são fórmulas nem acompanhamento ao vivo. Isso não se aplica aos
componentes `[x, y, z]` de um ponto, às legendas ou aos apoios.

| Campo | `tipo` | Parâmetros |
|---|---|---|
| `movimento` | `fixo` | `ponto` |
| `movimento` | `reta` | `de`, `para` |
| `movimento` | `curva` | `de`, `controle1`, `controle2`, `para` — `CubicBezierCurve3` nativa do Three.js |
| `movimento` | `trajeto` | `pontos` — lista de ao menos dois nomes ou vetores; passa por eles numa `CatmullRomCurve3` centrípeta, sem repetir pontos consecutivos |
| `movimento` | `orbita` | `centro`; pares `raio`, `angulo`, `altura`, do início ao fim. Raios não negativos em pc, ângulos em **radianos** por padrão e altura em pc ao longo do polo galáctico. `unidadeDoAngulo: "graus"` interpola primeiro em graus e converte cada instante |
| `movimento` | `helice` | Mesma forma da órbita, com raios positivos; `distancia` é o par de distâncias reais ao centro em pc, positivas e com razão finita não nula. `ritmoDaDirecao` opcional, padrão `glide`; aceita a mesma unidade angular |
| `mira` | `fixo` | `ponto` |
| `mira` | `pan` | `de`, `para`; `ritmo` opcional, padrão `smooth` |
| `mira` | `pan-cedo` | `de`, `para`, `ate` — interpola pontos, chega cedo e segura |
| `mira` | `pan-direcao` | `de`, `para`, `ate` — interpola direções a partir da câmera em movimento; use perto de um alvo |
| `mira` | `passagem` | `de`, `assunto`, `rumo`, `entrada`, `saida` — olhar que acompanha o assunto e depois entrega o rumo seguinte |

`ate`, `entrada` e `saida` são frações entre 0 (exclusivo) e 1; `saida`
nunca vem antes de `entrada`. São frações do **movimento já suavizado**,
como nas primitivas existentes, não segundos de relógio.

O `trajeto` passa pelos pontos, ao contrário dos controles da Bézier,
que apenas puxam a curva. O avanço usa o comprimento aproximado da
curva nativa: pontos desigualmente espaçados não criam arrancadas por
si só. A tabela de comprimentos é preparada na montagem; a curva é
calculada em escala local e devolvida em pc, inclusive em distâncias
solares. As duas pontas são exatas. Não há um relógio da biblioteca.

Na `helice`, `raio` e `altura` desenham a **direção**, não a distância
final: a forma é normalizada e ampliada por `distancia`. A distância
cresce ou diminui exponencialmente; `ritmoDaDirecao` suaviza só a volta.
Na saída do Sol, `ritmo: "linear"` mantém a mesma razão de afastamento
por segundo, enquanto `ritmoDaDirecao: "glide"` e
`ritmoDaLente: "glide"` suavizam o giro e a abertura da lente. A forma
continua usando a órbita existente, sem outra biblioteca ou relógio.

Receita do passo lateral: `movimento: { "tipo": "trajeto", "pontos":
["mirante", "curvaDoDesvio", "desvio"] }`, `mira` fixa em `Alnilam`
e `ritmo: "glide"`. Para uma passagem, use a mesma trajetória com
`mira.tipo: "passagem"`: ela acompanha o assunto e entrega o olhar ao
rumo seguinte. Para contornar, use `orbita` com a mira fixa no centro.
O arco do passo lateral foi uma melhoria deliberada de UX do item 75;
não é diferença causada pela conversão do formato.

**Ligação entre planos:** `trajeto` suaviza os pontos dentro de um
plano; não costura automaticamente cortes entre planos diferentes.
Para uma chegada e saída sem salto, compartilhe a âncora de ponta, a
mira e a lente nos dois lados e use um ritmo que assente antes da
próxima partida. Um voo sem parada deve ser um único trajeto; inserir
uma legenda não exige quebrar a câmera em outro plano.

`ritmo` e `ritmoDaLente` são opcionais no plano. Os nomes disponíveis são
`linear`, `quadratic`, `smooth`, `easeOut`, `glide`, `launch`, `settle`, `settleFreeze`
(as funções de `movimentos.ts`). Sem `ritmo`, a câmera usa `glide`; sem
`ritmoDaLente`, a lente acompanha o ritmo do movimento. Separá-los permite
aproximação e zoom com tempos diferentes, sem fórmulas no JSON.

`inclinacao` e `efeitoDeVelocidade` são opcionais dentro de `camera`.
Usam a fração do **tempo de relógio**, sem o `ritmo` da trajetória.
Omissão significa zero; a montagem copia os valores. Os formatos são:

| `tipo` | Dados e comportamento |
|---|---|
| `fixo` | `valor` constante |
| `rampa` | `de`, `para`, `ritmo` opcional (padrão `linear`); permite subir ou descer |
| `frenagem` | `amplitude`; cai por `amplitude × (1 − k)²` |
| `pulso` | `amplitude`, `base` opcional (0) e `frequencia` opcional (1); `base + amplitude × sen(π × k × frequencia)` |

No pulso padrão há uma meia onda: sai de zero, atinge a amplitude na
metade e volta a zero. `frequencia` fica entre 0 (exclusivo) e 1;
abaixo de 1, o plano termina antes de completar a meia onda.

A inclinação usa radianos e aceita sinal negativo para o outro lado.
O efeito de velocidade aceita valores de 0 a 1 e alimenta o que já existe:
pequena abertura adicional da lente, bloom, separação de cores e vinheta.
No pulso de velocidade, `base + amplitude` também deve caber em 0..1.
Não cria exposição adaptativa, tremor ou outro pós-processamento. Esses
formatos ainda não descrevem somas arbitrárias de curvas.

Nomes desconhecidos, números não finitos e parâmetros fora dessas faixas
interrompem a montagem com o campo indicado no erro. Não há `eval`, código
embutido no roteiro, dependência nova nem controle novo para o visitante.

**Limite desta base:** foram convertidas **20 de 25 cenas, 154 de 193 s**.
Essa fração mede o filme convertido, não a prontidão do motor. Faltam a
fuga/subida do Ato IV, a deriva, o mergulho de volta e a passagem
Lua–Terra. `assuntos` transporta os nomes para a regra atual, mas não
resolve a direção de etiquetas do item 82 — as três precisam falar
juntas. Esses recursos vêm antes da migração integral e do A/B de disco
zerado. Validação focal:
`npx vitest run src/three/cinematic/lerSequencia.test.ts src/three/cinematic/lerPlanoDeCamera.test.ts src/three/cinematic/apoiosDoRoteiro.test.ts`.
