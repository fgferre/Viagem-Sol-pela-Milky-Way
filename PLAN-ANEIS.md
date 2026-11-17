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
- Espessura da divisão de Cassini: código 10 m (Tiscareno 2007, faixa 2–20 m); a pesquisa de 15/11 achou 3–6 m. Conferir a fonte antes de mexer (muda imagem; pede prancha).
- O relógio dos pedaços é INTEGRADO quadro a quadro (P:5014–5027) e tem teto por quadro (`tetoDoPasso`, tanh): com o relógio rápido o cisalhamento anda mais devagar que o relógio, e um salto (seek do filme, troca de data) dá outro arranjo do que tocar até lá. Isto é do Passo 2.

## A descrição única proposta

Um módulo só, `src/three/world/corpos/anelDeSaturno.ts`, que NASCE POR MUDANÇA, não por invenção: recebe o que hoje está espalhado em G, P, R e T, e todos passam a importar dele (G já importa de P; P e R não importam de G — por isso a descrição não pode morar em G sem criar ciclo). Ele não desenha nada.

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
| picos da borda do B: raio, arco, altura máxima, taxa, época, longitude | km, °, km, °/dia | 117 547,6; ~10; 3,5; 758,986; JD 2455054,5; 95 | Spitale & Porco 2010 (contagem, forma e alturas abaixo do teto: sorteadas e confessadas) | R:30–82 |
| ondas de Dáfnis | — | o que G já desenha | — | G (`uDafnisLon`) |
| véus F e E (só referência nesta conversa) | km | F 140 180, 3 fios, dobra 100, excentricidade 40; E 170 000–330 000, pico 238 000 | projeto dele `fRing.ts`/`eRing.ts`, Murray 2008 | T:42–67 |

O nível de detalhe NÃO entra na descrição: é a máquina que decide, pela distância (quais oitavas cabem na tela, ponto ou malha) e pelo nível do menu (quantos pedaços, sombra no disco sim/não), como hoje.

## Ordem de junção (Passo 1, um commit por fusão; prova por imagem em cada uma)

Prova de cada junção: as fotos padrão antes e depois — `?atlas=1&foco=saturn` (longe), `?atlas=1&foco=saturn&ver=aneis` (perto) e a tomada do filme que atravessa o anel (fotos a t = 241,4 s e vizinhas, sem gravar o filme) — iguais (md5 ou |Δ| por pixel ≈ 0); mais `npm run typecheck`, lint e os testes tocados.

- **J1 — a descrição.** Criar `anelDeSaturno.ts` movendo para ele as duas tabelas de região fundidas numa (todos os campos), um leitor na CPU e um no GLSL, `KM_POR_RAIO`, GM, os números dos pedaços e das esteiras. G e P passam a ler dela; somem `REGIOES_DAS_PEDRAS`, `regiaoDasPedras` (vira o leitor único), o gêmeo GLSL de P e o teste de igualdade das duas tabelas. Imagem: idêntica.
- **J2 — a lajota sai.** Apagar `lajotaDoAnel.ts` e o teste, o `else` de G, `PEDRAS_3D` e a leitura de `?pedras` (inclusive o `?pedras=3d` que nada faz), o ramo de 12 km do chão (o chão hoje usa a janela `VOLUME_DA_LAJOTA`, 55 000–160 000 km, G:2235, e nasce com 12 km, G:2481: a janela passa para a descrição como "onde há pedaços", a mesma de P:2919), as linhas de escala e do censo, o teste do chão refeito com a espessura medida. Deixa de existir: `?pedras=0` (o anel de antes de 15/11, com os grãos de 4–14 km). Imagem padrão: idêntica.
- **J3 — o protótipo do relevo sai do jeito que está.** Apagar a fita e `?relevo=1` (some a colisão com a Terra); os números medidos dos picos já moram na descrição desde J1. Deixa de existir: a fita dos picos por URL. Imagem padrão: idêntica. O relevo VOLTA como etapa 4, lido pela mesma máquina.
- **J4 (Passo 2) — o giro.** Ver abaixo.

Se a coordenadora preferir manter o protótipo do relevo vivo até a etapa 4, J3 vira só a troca do nome da chave; recomendo apagar, porque nunca foi aprovado e reaparece melhor por dentro.

## Passo 2 — o anel dá a volta com o relógio (proposta, a fazer depois de J1–J3)
- Cada pedaço tem ângulo θ₀ + Ω(ρ)·(t − t₀), com t do relógio do app em dupla precisão na CPU; o que o vértice recebe são fases por oitava e por fileira do ladrilho já reduzidas ao período (o ladrilho é periódico, então qualquer deslocamento é válido). Calculado a partir da data e não somado quadro a quadro: o mesmo instante dá o mesmo arranjo, tocando ou saltando (filme, seek, fotos).
- O teto por quadro sai: o mundo anda com o relógio inteiro. Com o relógio rápido o pedaço anda vários ladrilhos por quadro e vira estroboscópio; isto é verdade do que se vê com aquele relógio, não defeito (a câmera que quiser ver parado entra em órbita junto — escolha de câmera, não do mundo; a vista "Anéis" é candidata, pergunta ao dono).
- O disco gira junto onde ele tem desenho que não é igual em toda volta (esteiras lidas do ladrilho); o perfil é simétrico e não muda.
- Prova pedida: duas fotos com a câmera parada em horas diferentes do relógio. Cuidado: com horas inteiras de diferença o material que passa é outro e as duas fotos ficam estatisticamente iguais; a prova legível é Δt pequeno (fração de segundo a poucos segundos, perto) com o desenho deslocado de Ω·ρ·Δt, mais um teste que confere a posição de um pedaço em t e t + Δt.

## Depois (fora do que cabe nesta conversa, em ordem)
3. Os quadradinhos claros nos pedaços a ≤ 5 m (também no filme a 241,4 s).
4. Relevo pela máquina: h(ρ, θ, t) na descrição; pedaços, camada, disco e sombra leem a mesma h; picos do B primeiro, depois Dáfnis e a onda de Mimas 5:3 (Sega 2024). O dono vê com Sol de hoje e com Sol rasante antes de virar padrão.
5. Os véus F e E com os números da descrição.
6. Urano, Netuno, Quaoar e Haumea pela mesma descrição (perfil em parâmetro no lugar do `uModo` à mão); Haumea na lista do eclipse; modo `quaoar` morto em G.
7. WebGPU para os pedaços (decisão do dono de 14/11: depois da imagem).

Fora desta frente: a faixa de poeira da galáxia em blocos sobre Saturno (código da galáxia); as duas frases sobre a espessura (o dono: "Deixe como está"); tudo das estrelas.
