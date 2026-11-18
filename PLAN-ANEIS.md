# O anel de Saturno com uma descrição só, lida por uma máquina só — 17/11/2026

Ramo `claude/aneis-um-jeito-so-7debd8` (worktree em `.claude/worktrees/aneis-um-jeito-so-7debd8`, posto no `main` local 7d6e0cbb antes de começar). Provas em `capturas/aneis-um-jeito-so/` da pasta principal. Quem decide é a coordenadora; o dono decide o que é gosto, por imagem.

## Passo 0 — o que existe hoje (fatos do código em 7d6e0cbb)

Sigla dos arquivos: G = `src/three/world/corpos/gigante.ts`, P = `pedrasDoAnel.ts`, L = `lajotaDoAnel.ts`, R = `relevoDoAnel.ts`, T = `aneisTenues.ts`, Q = `rochoso.ts` (mesma pasta).

### (a) As peças do anel de Saturno

| peça | desenha | distância | qualidade do menu |
|---|---|---|---|
| Disco (G, `ANEL_FRAG` + `GLSL_CAMADA_DO_ANEL`) | anel chapado `RingGeometry` 1,110–2,326 R (66 900–140 180 km), perfil medido 2048 caixas (`data/atlas/anel-saturno-perfil.bin`, G:146), regiões com albedo/poeira/τ (`REGIOES_DO_ANEL`, G:237), raios do B por `fbmDoAnel` (G:1410–1437), ondas de Dáfnis, sombras planeta↔anel | sempre | nenhum ramo |
| Pedaços 3D (P, padrão) | pedaços de 0,5 cm a 10 m (n ∝ a⁻³), 10 oitavas em ladrilhos periódicos, esteiras de autogravidade (ladrilho 8,192 km), sombra dos pedaços no disco, profundidade própria do disco | 55 000–160 000 km do centro, só onde há oitava com tamanho de tela (P:4944–4997); pontos < 12 px, malhas acima | só a contagem (cinema 16 384 / alta 8 192 / performance 3 072, P:132) e performance sem sombra no disco (P:5082) |
| Lajota (L) | grãos aditivos de 4–14 km numa camada de ±12 km, ladrilho de 4 900 km que salta com a câmera | 55 000–160 000 km e até 1 600 km do plano | contagem por nível (L:130) |
| Relevo (R, `?relevo=1`) | fita com 64 picos de até 3,5 km na borda do B, sombra por marcha, giro rígido a 758,986°/dia | perto da borda do B | — |

O que já é UMA máquina: disco e pedaços. O disco entrega aos pedaços, por injeção, a sombra do planeta, a camada (fase e luz), as regiões e a mesma textura do perfil (G:2450–2459, G:2530); a luz se conserva porque o disco CEDE aos pedaços a fração de τ que eles desenham (`cessaoDoDisco`, P:207). O chão do anel para a câmera também lê a espessura dos pedaços (G:2238–2244).

O que está repetido:
- a tabela das regiões duas vezes, com as mesmas fronteiras (`REGIOES_DO_ANEL` G:237 e `REGIOES_DAS_PEDRAS` P:253, um teste cobra a igualdade), e os gêmeos de leitura na CPU (`regiaoDoAnelCpu` G:278 × `regiaoDasPedras` P:263) e no GLSL (G:302 × P:1215);
- `KM_POR_RAIO` de Saturno definido cinco vezes (P, R, L, T e no GLSL de G);
- a lajota repete o anel inteiro com outros números: espessura própria de 12 km (não a medida de 4–10 m), lobo de luz próprio (`0,55 + 1,6·cos⁴`, L:234) em vez da camada do disco, sorteio próprio; só a sombra do planeta e o perfil são os do disco;
- o relevo tem sorteio próprio (`mulberry32`, R:106, igual ao de P:3178) e não partilha altura com os pedaços nem com o disco.

### (b) A lajota serve a alguém?
Não. Ela só nasce no `else` de `PEDRAS_3D` (G:2449–2468), e `PEDRAS_3D` só é falso com `?pedras=0` (P:63). Celular, níveis baixos e filme usam os pedaços (performance tem 3 072). Não há ramo de reserva que caia nela (sem alvo de render em float os pedaços só perdem a sombra no disco). Ela é a saída de emergência `?pedras=0` e nada mais. Arrasta consigo: linha no cadastro de escala (`src/three/escala.ts:441`, com endereço de linha já errado), linha no censo da luz (`src/three/cadastroDeRepresentacoes.ts:471`), o teste dela, o ramo "12 km" do chão do anel e o teste do chão em `corpos.test.ts:536` (que mede com 12 km), comentário em `director/palco.ts:94`. `scripts/visual/retrato-de-familia.mjs:261` esconde uma chave `lajota` (não posso editar `scripts/visual/`; esconder uma chave que não existe é inofensivo — conferir na junção).

### (c) O protótipo do relevo
O que falta para ser parte do anel: hoje é uma FITA própria (2048×16 segmentos) que só existe numa faixa de 10° da borda do B; os pedaços e o disco supõem o plano z = 0 (P:48, P:281, P:2674, G:1301), então os picos ficam vazios de pedaços e a fita desenha uma superfície que não é feita de nada. Para ser do anel: a altura h(ρ, θ, t) entra na descrição; os pedaços somam h ao seu z (e a camada se desloca junto), o disco desloca a profundidade e a sombra pela mesma h, e a fita some. O achado de 15/11 vale: só dá espetáculo com o Sol rasante (equinócio de 2009, sombras de centenas de km); na data de hoje e no dia do filme os picos viram tracinhos pretos na borda (prancha `capturas/aneis-relevo-15-11/b1-picos.jpg`). O dono nunca o aprovou por imagem; ele escolheu a ida aos anéis à mão em vez de seguir.

### (d) Quaoar e os outros anéis
- A "cópia de Quaoar" do comentário do topo de G (G:40–41) já não é cópia: Quaoar e Haumea têm um bloco próprio em Q:1539–1572 que importa o MESMO shader procedural `ANEL_PROC_FRAG` de G e a mesma ponte de frame `componentesNoFrameDoAnel`. Urano e Netuno usam esse shader em G:2375–2429. O que muda entre os quatro está escrito à mão por corpo dentro do shader (`uModo`, ramos G:1735–1767); raios em `ANEIS_CITADOS` (G:467–496).
- Saturno é o único fora dessa família: shader próprio + perfil medido + véus F e E (T, desenho analítico, sem perfil).
- Júpiter não tem anel desenhado; Chariklo não existe no app.
- Cabem na mesma máquina por parâmetro? Sim na forma: um anel é um perfil radial (τ, cor, albedo) + espessura + lei de tamanhos + esteiras (onde há) + giro kepleriano pela massa do corpo. Hoje os quatro têm perfil analítico de faixas; virar perfil em parâmetro os põe na máquina de Saturno, inclusive os pedaços de perto. Não é desta conversa: fica como etapa 6.
- Sobras vistas: modo `quaoar` morto em G:2378 (Quaoar não é gigante); Haumea fora de `CORPOS_COM_ANEL` (lista de quem tem anel para o eclipse, importada em G:73), embora tenha anel — efeito a conferir.

### (e) Os dois `?relevo`
- Terra: `?relevo=real|realcado` (`director.ts:1151`, `core/engine.ts:327`, espelho na URL `hooks/useEspelhoDaUrl.ts:354`, selo `selo.ts:859`, Ajustes). Valor fora da lista vira `real`.
- Anel: `?relevo=1` (R:23). Ligar o anel liga também, calado, a Terra em `real` (é o padrão, então hoje não muda nada) e o espelho da URL pode reescrever a chave.
- Solução: o interruptor do anel deixa de existir (ver junção J3); a chave `relevo` fica só da Terra.

### Outras inconsistências achadas (não consertadas no Passo 0)
- P:42 diz "agitação medida"; P:712–718 diz não medida (equipartição). Corrigir a palavra na J1.
- Espessura da divisão de Cassini: código 10 m (Tiscareno 2007, faixa 2–20 m); a pesquisa de 15/11 achou 3–6 m. Decisão da coordenadora (17/11): não mexer; antes, ler o artigo direto (não resumo) e só então propor, com prancha.
- O relógio dos pedaços é INTEGRADO quadro a quadro (P:5014–5027) e tem teto por quadro (`tetoDoPasso`, tanh): com o relógio rápido o cisalhamento anda mais devagar que o relógio, e um salto (seek do filme, troca de data) dá outro arranjo do que tocar até lá. Isto é do Passo 2.

## A descrição única proposta

Um módulo só, `src/three/world/corpos/descricaoDoAnel.ts` (feito na J1: tipo `DescricaoDeAnel`, Saturno como primeiro valor), que NASCE POR MUDANÇA, não por invenção: recebe o que hoje está espalhado em G, P, R e T, e todos passam a importar dele (G já importa de P; P e R não importam de G — por isso a descrição não pode morar em G sem criar ciclo). Ele não desenha nada.

| parâmetro | unidade | valor / faixa | fonte (a do comentário de hoje) | hoje em |
|---|---|---|---|---|
| raio de dentro e de fora do desenho | km | 66 900 – 140 180 | anel D e anel F (cicatriz W5-B, doador) | G:119 |
| perfil radial: τ e cor por raio | arquivo, 2048 caixas | 66 900 – 140 500 km | modelo de Björn Jónsson (licença a conferir antes de publicar) | G:146 |
| perfil de brilho | arquivo | — | idem | G:353 |
| regiões: fronteira e meia-rampa | km | D 0; C 74 490/150; B 91 980/300; Cassini 117 580/60; A 121 450/650; além do A 136 775/60 | G:237 (comentário) | G:237 e P:253 |
| por região: albedo, poeira, fator de τ | — | A 0,85 / 0,1 / 1; B 1 / 0 / 2; … | G:237 | G |
| por região: espessura total | m | C 4 (Baillié 2011, 1,9–5,6); B 8 (NÃO medido, adotado o do A); Cassini 10 (Tiscareno 2007, 2–20); A 8 (Colwell 2006, Hedman 2007, 6–10); D e além do A 4/8 | P:244 | P:253 |
| por região: força das esteiras | — | A 1, B 1,05, C e Cassini 0 | Colwell 2006, Hedman 2007 | P:253 |
| tamanho dos pedaços | cm–m | 0,5 cm a 10 m, n(a) ∝ a⁻³ | Zebker 1985, Cuzzi 2009, Harbison 2013 | P:76–99 |
| esteiras: comprimento de onda, inclinação | m, ° | ~60 m; 18–24° (A), 18–26° (B); usado 20,9° | Colwell 2006/2007, Hedman 2007, Salo 2004, Michikoshi 2015 | P:289–349 |
| agitação (velocidade aleatória) | mm/s | 1 (não medido, equipartição) | P:712 | P:719 |
| giro: Ω(ρ) = √(GM/ρ³) | rad/s | GM = 37 931 207 km³/s² | (fonte a escrever no comentário) | P:70, P:626 |
| corotação dos raios do B | h | 10,66 | G:181 | G:181 |
| ondas de Dáfnis | — | o que G já desenha | — | G (`uDafnisLon`) |
| véus F e E (só referência nesta conversa) | km | F 140 180, 3 fios, dobra 100, excentricidade 40; E 170 000–330 000, pico 238 000 | projeto dele `fRing.ts`/`eRing.ts`, Murray 2008 | T:42–67 |

O nível de detalhe NÃO entra na descrição: é a máquina que decide, pela distância (quais oitavas cabem na tela, ponto ou malha) e pelo nível do menu (quantos pedaços, sombra no disco sim/não), como hoje.

## Ordem de junção (Passo 1, um commit por fusão; prova por imagem em cada uma)

Prova de cada junção: as fotos padrão antes e depois — `?atlas=1&foco=saturn` (longe), `?atlas=1&foco=saturn&ver=aneis` (perto) e a tomada do filme que atravessa o anel (fotos a t = 241,4 s e vizinhas, sem gravar o filme) — iguais (md5 ou |Δ| por pixel ≈ 0); mais `npm run typecheck`, lint e os testes tocados.

- **J1 — FEITA (9acae86f).** `descricaoDoAnel.ts`: tipo `DescricaoDeAnel` e o valor `ANEL_DE_SATURNO` (raio equatorial, GM, raios do desenho, perfil e brilho, as regiões fundidas numa tabela com todos os campos, pedaços com a janela de 55 000–160 000 km e a agitação, corotação dos raios do B, véus F e E) e um leitor na CPU, `regiaoDoAnelCpu`. Sumiram `REGIOES_DAS_PEDRAS`, `regiaoDasPedras` da CPU, o teste de igualdade das tabelas e as cópias de `KM_POR_RAIO`. Dump de todos os GLSL e dos leitores antes/depois: idêntico. Ficou: os dois leitores GLSL (`regiaoDoAnel` vec3 com toFixed(4), `regiaoDasPedras` vec2 com toExponential(9)) agora gerados da mesma tabela, mas ainda duas funções (fundir muda o texto do shader; fazer junto com uma mudança que já mude a imagem); comprimento de onda e inclinação das esteiras não são constantes nomeadas (saem do ladrilho), não foram movidos; Keeler, `COR_B`, `ALBEDO_GEO` seguem em G; comentários velhos citando `PERFIL_DO_ANEL` em `texturas.ts:169` e num script de dados.
- **J2 — FEITA (0bf78f02).** Saíram `lajotaDoAnel.ts` e o teste, `PEDRAS_3D` e a leitura de `?pedras`, as linhas de escala e do censo; o chão do anel lê a janela da descrição (55 000–160 000 km, a mesma) e sempre a meia-espessura medida; o teste do chão refeito com ela. Deixou de existir: `?pedras=0` (o anel de antes de 15/11, com os grãos de 4–14 km). Para a coordenadora ver na junção: `scripts/visual/retrato-de-familia.mjs:261` esconde uma chave de página `lajota` que não existe mais (inofensivo; não editei `scripts/visual/`); `docs/reference/saturn-colheita.md:50,117` cita a lajota como história.
- **J3 — FEITA (079d31b7).** Saíram `relevoDoAnel.ts` e o teste, a fita e seus ramos no shader, a linha `picos-da-borda-do-anel-b` do censo e `?relevo=1`; a chave `relevo` é só da Terra. Os shaders padrão do anel batem com os hashes que o teste do protótipo fixava. Deixou de existir: a fita dos picos por URL.
- **J4 (Passo 2) — o giro.** Ver abaixo.

Se a coordenadora preferir manter o protótipo do relevo vivo até a etapa 4, J3 vira só a troca do nome da chave; recomendo apagar, porque nunca foi aprovado e reaparece melhor por dentro.

## Passo 2 — o anel dá a volta com o relógio: FEITO (J4, ddbe5fe9)
- Cada fileira do ladrilho (3 por oitava) ganha a fase calculada na CPU em dupla precisão a partir da data: Ω exato no centro da fileira, cisalhamento linear dentro dela; precisão ~3 mm na oitava mais fina para ±40 anos. Giro próprio pela data. Sumiram a soma quadro a quadro, `tetoDoPasso`, `jdAntes`, a perda de tempo com o anel escondido e o `omega`/`GM_SATURNO` privados (Ω agora é `omegaDoAnelCpu` da descrição).
- Esteiras andam com o material: faixas radiais de 2,048 km, cada uma deslocada por R0·Ω(centro)·t, com transição de ±0,256 km nas bordas; pedaços, passe de sombra, escolha de células na CPU e folha das esteiras leem o mesmo campo.
- Época do sorteio = data do filme (`epocaDoSorteioJdTdb` = JD2_SOLAR_TDB, teste cobra): o filme a 238 s sai idêntico; a 241,4 s e 244 s diferem 315 e 147 pixels de 1 milhão (pontinhos na faixa do anel).
- Vista "Anéis": a longitude do ponto anda Ω(ρ do ponto)·(t − entrada); de perto só se vê o cisalhamento e a agitação.
- Provas em `capturas/aneis-um-jeito-so/antes-j4/` e `depois-j4/`, prancha `prancha-j4.jpg`. Custo na vista dos anéis (cinema, ms por quadro, máquina a carga ~17): antes 20,1/17,4/17,8; depois 17,0/15,9/16,4; com o relógio ao vivo (320 dias da época) 17,1/17,3/19,3. Performance 12,6/10,8/11,7 → 11,5/11,7/11,7.
- Abertos: (1) nas bordas das faixas das esteiras (25 % dos raios), depois de ~10 min de relógio, o contraste das esteiras cai (dispersão 0,50 contra 0,63; p95/p5 4,3 contra 7) e os pedaços derivam até 0,2 m/s em relação a elas — não visto na foto, não medido por imagem; (2) longe da época a escolha de células só corta por raio: o trabalhador contou 2–2,4× mais células a 20 m de altura; a medida de custo ao vivo não mostrou aumento fora do ruído, mas não foi medida a 20 m; (3) o AO VIVO anda a 1 Hz: pedaços e câmera saltam ~17 km juntos uma vez por segundo (relativo, nada se vê); (4) relógio rápido: de perto, na vista dos anéis, o cisalhamento deve virar chuvisco quando o passo por quadro passa do tamanho dos pedaços (esperado pela conta, NÃO fotografado); de longe nada muda (o perfil é simétrico; os raios do B e Dáfnis andam como antes).

### J4b — o que a revisão da coordenadora (17/11) pede antes de juntar a J4 (nesta ordem)
1. Esteiras lavadas nas bordas das faixas (`pedrasDoAnel.ts` ~563–580 CPU, ~1375–1414 GPU): a fusão faz MÉDIA de dois campos que, depois de ~6 min de relógio, não batem; no meio da faixa a crista cai de ~5 para ~1,4. No estado de todo visitante (ao vivo, ~320 dias da época) viram listras de ~0,5 km sem esteira a cada 2,048 km. A densidade da folha na faixa erra até ~35 % nas cristas. Alvo: mesma dispersão e p95/p5 que o miolo, medidas NA IMAGEM, dentro de ~5 %, sem listra; com base citada. Caminho escolhido: esteira TRANSITÓRIA (a literatura que o arquivo cita: estrutura que se refaz na escala do período orbital e mantém a inclinação): duas gerações do campo, cada uma levada pelo fluxo de Kepler exato desde o nascimento (contínuo em ρ, sem faixas), vida T constante, defasadas de T/2 e misturadas com pesos sen/cos (soma dos quadrados = 1, fusão que conserva a variância, antes de qualquer não-linearidade); T limitado pela faixa de inclinação medida (18–26°) sob o cisalhamento kepleriano. Prova: foto ao vivo da chegada a 1,5 km e a ~300 m, `main` × ramo, e a medida.
2. Custo longe da época (~4249, ~4294): a escolha de células só corta por raio quando o cisalhamento acumulado é grande — é o estado de todo visitante ao vivo. Medir ms por quadro ao vivo a 20 m e a 1,5 km, cinema e performance, `main` × ramo; se subir fora do ruído, resolver (corte pelo ângulo com a fase reduzida).
3. A GPU recebe a defasagem de só ±8 faixas (±16 km, ~300 e ~5088), mas a folha alcança 40 km ou mais (~5090): além disso as esteiras deslizam em bloco; o comentário em ~300 é falso. Some com o item 1 (sem faixas).
4. Relógio rápido de perto: fotografar 3–4 quadros seguidos com o relógio acelerado na vista dos anéis a ~300 m e a ~20 m, e dar a frase ao dono pelo que a foto mostra.
Testes pedidos: estatística da esteira na mistura contra a pura (CPU) e a câmera andando junto com os pedaços no mesmo teste. Sem juiz de imagem novo.

## Depois (fora do que cabe nesta conversa, em ordem)
Provas desta rodada: `capturas/aneis-um-jeito-so/` (roteiro `rodar.sh <porta> <pasta>`; `antes/` é o app em 6b01d3e6; Atlas com `jd=` e `shot=1`, filme com `shot=2` e seek; cada vista sai igual pixel a pixel em duas tomadas).
3. Os quadradinhos claros nos pedaços a ≤ 5 m (também no filme a 241,4 s). DIAGNÓSTICO FEITO (17/11, sem conserto): um pedaço a menos de 1 m da câmera ainda é desenhado como PONTO, e o ponto tem teto de 48 px (`pedrasDoAnel.ts` ~2274) — sai um quadrado chapado de 48×48 (no filme x 667–715, y 721–769). A escolha ponto × malha usa `xo`, a distância no ladrilho ANTES do empurrão da esteira (~1633–1639; corte ~1585, ~1665; mistura `lobos` ~1974; janela da CPU `2^X_CORTE·s` ~4522); a esteira desloca até ~15 m (`DESLOCAMENTO_MAXIMO_KM`, ~319, ~1683), então um pedaço com `xo` 6–6,5 cai rente à lente ainda como ponto (sonda: tamanho sem teto 256–512 px, profundidade 0,1–1 m). Prova: `capturas/aneis-um-jeito-so/passo3/antes-filme-t241.4.png` e a sonda `sonda1-filme-t241.4.png` (as sondas 2–4 são corridas quebradas). Conserto proposto: decidir malha × ponto pela distância DEPOIS do empurrão (`length(gOff)/s`) em `noQuadro`, `lugar` e `lobos`, só pedaços opacos; a CPU alarga a janela para `min(2^X_CORTE·s + D_MAX, 2^X_PLENO·s)` com um teste barato por pedaço (distância ao segmento de deslocamento possível). Custos a medir: varredura da CPU nas 2–3 oitavas finas (~80 mil contra ~30 mil iterações por quadro dentro da camada), capacidade das malhas (`capacidadeDePerto`); pedaços ainda entrando (`xo` 8–9) seguem pontos. Achado vizinho a conferir: a janela de entrada também é centrada na câmera em coordenadas antes do empurrão — onde a esteira é forte os pedaços mais finos perto da câmera podem faltar ou ficar meio transparentes e mudar com o movimento da câmera (mundo dependendo da câmera).
4. Relevo pela máquina: h(ρ, θ, t) na descrição (só quando houver leitor); pedaços, camada, disco e sombra leem a mesma h; picos do B primeiro, depois Dáfnis e a onda de Mimas 5:3 (Sega 2024). O dono vê com Sol de hoje e com Sol rasante antes de virar padrão. Números dos picos da borda do B (Spitale & Porco 2010, AJ 140, 1747; arXiv:0912.3489): raio 117 547,6 km; ~10° de arco; até 3,5 km de altura pelas sombras (a legenda PIA11668 diz 2,5); giram na taxa orbital local 758,986°/dia; época JD 2455054,5 com a faixa a 95° de longitude; contagem, espaçamento, forma e alturas abaixo do teto NÃO medidos (sorteados e confessados; o protótipo usava 64 picos em 32 células). O perfil do app põe a borda do B em ~117 500 km, não em 117 568: a faixa ia a ~20 km da borda do app. Protótipo e pranchas em `capturas/aneis-relevo-15-11/` e no commit e6e4d3d1.
5. Os véus F e E com os números da descrição.
6. Urano, Netuno, Quaoar e Haumea pela mesma descrição (perfil em parâmetro no lugar do `uModo` à mão); Haumea na lista do eclipse; modo `quaoar` morto em G.
7. WebGPU para os pedaços (decisão do dono de 14/11: depois da imagem).

Fora desta frente: a faixa de poeira da galáxia em blocos sobre Saturno (código da galáxia); as duas frases sobre a espessura (o dono: "Deixe como está"); tudo das estrelas.
