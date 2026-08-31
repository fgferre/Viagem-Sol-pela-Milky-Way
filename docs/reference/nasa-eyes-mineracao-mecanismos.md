# Mineração de mecanismos — NASA Eyes, sessão de 30-31/08/2026

Doze mergulhos de engenharia reversa comparada sobre a cópia local do
NASA Eyes, feitos DEPOIS do estudo consolidado
([`nasa-eyes-estudo-completo.md`](nasa-eyes-estudo-completo.md), que
cobriu o funil de demanda visual, labels, iluminação, Dynamo e stories).
Esta sessão minerou a fronteira que faltava e confrontou cada mecanismo
com o nosso código, com medidas. Os documentos-fonte, as fichas de 57
classes, os scripts de medida e as capturas vivem em
`scratchpad/estudos/nasa-eyes-solar-system/mineracao/` (fora do git;
retomada pelo `CHECKPOINT.md` de lá).

## Método e confiança

- Censo das 261 classes do `app.js` com tamanho; ferramenta de extração
  por classe/faixa (ninguém leu bundle inteiro); 57 fichas (mecanico);
  9 mergulhos (executor) com fórmulas **portadas verbatim para scripts**
  que produzem cada número citado.
- O bundle preserva nomes de classes/métodos; o coordenador conferiu
  alegações letra a letra em amostras, e os mergulhos **desmentiram 4
  alegações de ficha** com medida — o sistema se autocorrige.
- `vendors.js` é three.js **r185 vanilla** (mesma revisão que a nossa,
  441/441 exports idênticos, 12 classes amostradas): toda a engenharia
  deles mora no `app.js`.
- Tamanho, medido: nosso src 2,28 MB de TS legível vs 1,74 MB deles
  **minificado**, que se decompõe em 23% catálogo de dados, 33%
  superfície de produto que não temos por decisão (stories, kiosk,
  share, comparação, telescópio) e 44% motor.

## Placar honesto — onde JÁ somos melhores (medido)

- **Fotometria/faixa dinâmica**: o Eyes não tem NENHUM shader de pós
  (sem bloom, tonemap, AA de shader, dither; cor linear crua). Nossa
  cadeia (asinh 3 estágios + ACES + blue noise + PSF + Ballesteros +
  Nishita) está à frente por categoria (mergulho 07).
- **Z-fighting**: 1,87 m vs 9,44 m de quantização a 10.000 km da Terra
  (mergulho 02).
- **Transição multi-escala**: lei logarítmica escrita direto, duração
  proporcional à travessia, dt determinístico, cancelamento por gesto
  (eles: 1 s fixo de parede, ease∘compensação que percorre 90% das
  décadas na metade do tempo) (mergulho 01).
- **Navegação**: dt-correction, quaternion sem polo, passo de zoom
  adaptativo, atrito integral, higiene de multitoque — e o item 102 já
  tinha importado deles a suavização 0,8 e o freio do solo (mergulho 03).
- **Enquadramento**: margem única vs 4 valores em 6 lugares + tabela
  curada que vence a geometria; o retrato de família compõe dois corpos
  — o Eyes não tenta (usa dois viewports) (mergulho 04).
- **Órbita/orientação de corpos**: erro de órbita medido por corpo no
  manifest vs HTTP deles; IAU 86 termos vs `Quaternion.Identity` em
  centenas de luas (mergulho 05).
- **Busca**: estado vazio honesto da PaletaDeBusca > "Did you mean" por
  chute; taxa de tempo em unidade humana já temos (mergulho 06).
- **URL como espelho**: o `localStorage` deles é vazio; todo estado na
  URL — confirma a doutrina do dono.

## Ganhos reais — candidatos a obra, ranqueados

Nada abaixo está decidido; decisão é do dono e vira item numerado
quando ele mandar. O item **114** (todas as luas) já existe.

### Bloco A — memória de texturas (mergulho 09; o buraco mais grave)

Nós **não descarregamos textura nenhuma** (dispose só no teardown,
`director.ts:2908`); pior caso do manifest: **1,12 GiB residentes**
(Terra 341,3 MiB). Deles: refcount por (tipo,url) + **morte adiada
15 s** + liberação CPU+GPU juntas; fila de 20 downloads com prioridade
e abort.
1. Refcount + descarga adiada 15 s — o único item que o mergulho faria
   sem A/B.
2. `createImageBitmap` (decodificação fora da thread principal).
3. KTX2 só nos canais de apoio (4–8× VRAM, mas troca banda por VRAM —
   somos GitHub Pages; nosso webp mede 0,0585 B/px vs 0,25–0,5 do KTX2).
4. Só o `abort()` da fila.

### Bloco B — a fita e os rótulos (mergulho 08; a queixa de beleza do dono)

MSAA nosso atual = **zero** (`engine.ts:419` antialias:false; composer
sem alvo próprio ⇒ samples 0). O "definido" deles é `samples:4` no alvo
do composer — o shader de linha deles nem tem AA. Atenção: ligar
`antialias:true` no renderer seria inerte; o caminho é `samples` no
alvo (tecnicamente distinto da proibição registrada no ARQUIVO).
Ranqueado (R1–R8 no doc): `samples:4` + aposentar a saia da fita (o
maior salto, re-baseia md5 e exige medir GPU antes); gradiente de alfa
por vértice ancorado no corpo (a "fita com fade" barata); rampa
temporal de rótulo 250 ms entrar / 750 ms sair (a mais barata — hoje
não temos rampa nenhuma); oclusores de rótulo = todos os corpos (hoje
SÓ o Sol, `rotulos.ts:149` — foto mostra FOMALHAUT sobre o disco da
Terra); hover de ponteiro na órbita; hierarquia tipográfica.

### Bloco C — consertos pequenos de câmera (mergulhos 01 e 03)

- **G1**: direção da rampa por slerp — `lerpVectors+normalize`
  (`atlasRig.ts:1360-1362` e `:774-776`) estoura 7,7× a velocidade
  angular média a 170° (~890°/s); o `slerpDir` pronto está em
  `cameraRig.ts:34-56`; extremos não mudam (md5 fica de pé). Pede uma
  captura no app vivo antes de virar obra.
- **G3**: embalo de zoom sobrevive à parede — 0,55–0,84 s queimados;
  conserto = `roda.esquecer()` quando `pinarDistancia` grampeia.
- **G4** (condicional): ganho de arrasto `× min(1, fov)` — só se o modo
  fotografia fechar a lente (a 8° seria 17× trepidação).

### Bloco D — o caminho das luas (mergulhos 05, 06, 04; serve o item 114)

Com ~300 luas, dois pontos nossos quebram: instanciar tudo no boot e
varrer a lista inteira por quadro. Os 7 mecanismos que faltam (doc 05
§3, cada um com referência no Eyes): existência por quadro; teste do
quintal do pai (efeméride de lua só quando o pai cresce na tela;
limiar 20, systemRadius ≈ 2× apoastro da lua externa — derivável do
nosso `corpos.json`); registro declarativo único (hoje um corpo novo
toca 6 arquivos — item 92); representação sem textura (lá, ~700 corpos
usam 3 modelos genéricos + escala); classes de peso (30 Major / 421
Minor); índice por grupo; política de linha de órbita em volume. Na
UI: "Major Moons (4)" ligado / "Minor Moons (97)" desligado por padrão
com contagem no rótulo; `enquadrar()` multi-alvo (fit assimétrico,
mergulho 04) para "planeta + luas ao vivo". Dado: o piso de ~36 globos
já está pago no nosso manifest.

### Bloco E — profundidade (mergulho 02; condicional a descer à superfície)

Nosso near tem piso `raio*0.5` que **corta o próprio corpo** abaixo de
meia-raio de altitude (Terra 3.189 km; pinado em
`engine.test.ts:275-287`). A banda linear+log deles no fragment
desacopla precisão do near e permitiria descer sem trocar clipping por
z-fighting; custo: `gl_FragDepth` desliga early-Z (se vier: só opacos
do palco, FPS medido antes). Só vale se o produto decidir descer.

### Bloco F — pequenos de shader e UX (mergulhos 07 e 06)

- Rolloff de estouro por pixel `min(1,(c/max)^(1/max))` como candidato
  ao núcleo de fonte forte (comparar com nosso `peak/(peak+P50)`).
- Trapézio na integral da nebulosa; higiene float32
  `length(v/1e8)*1e8` nos vetores em parsec.
- Uma linha cada, se um dia houver env-map/2ª luz:
  `indirectSpecular *= totalDirectIrradiance` e
  `directDiffuse *= 1 − ambient`.
- UX: migalha com "casa" que reenquadra; toast 2 s com desfazer dentro;
  blocos por categoria na busca; contagem promovida ao rótulo visível.
- Pirâmide de tiles estática é viável (~31 MB/corpo nível 2, formato
  100% estático; por Marte) — onda própria, só depois do Bloco A.

### Rodada final — mergulhos 10, 11 e 12 (31/08, escolhidos pelo dono)

**Relógio e giro (10)** — tranquilizador: nossa orientação é IAU
analítica e stateless (função pura do tempo, como o `ori` deles), não
há salto de rotação a proteger, e o amortecedor que a ficha sugeria
NUNCA roda em planeta no próprio Eyes (censo: 9 usos, todos juntas de
nave). A guarda do `?jd=` cobre todos os consumidores (censo por
endereço). Um ganho barato: apertar ⏵ contra a parede do tempo faz
nosso aviso piscar e o botão reverter (`maquinaDoTempo.ts:181-188` vs
`262-287`); o desenho deles evita por construção — conserto de uma
condição. Registrados sem obra: aliasing de giro no degrau 7 (Júpiter
4,66 voltas/quadro; eles aliasam 9,5× pior) e o risco do AO VIVO a 1 Hz
cortar rampas de cessão em snap (não confirmado na tela).

**Régua de distâncias (11)** — feature candidata com mecânica decifrada:
ponto-entre como ENTIDADE (soma ponderada de posições — acompanha os
corpos de graça), medida superfície-a-superfície com o raio do terreno
real na direção do outro corpo, pose em "tenda" com o PARA-CIMA da
câmera sendo a própria linha (o segmento cabe a prumo), corredor de
picking de 80 px. Achado de doutrina: o bundle deles tem ZERO unidade
astronômica (Netuno vira "4.33 billion km") — nossa escada de unidades
ganha no trecho central do produto deles; a nossa régua chamaria
`notaDeDistancia` e COPIARIA uma ideia só: a segunda linha em TEMPO DE
LUZ (segundos-luz da Lua → anos-luz), a mesma razão do ano-luz sobre o
parsec. Aviso colateral: o deep-link frio deles abre QUEBRADO (cena
preta) — lição de teste para a nossa porta `?atlas=`.

**Busca e cometa (12)** — a busca deles é Fuse.js de prateleira e,
medida contra o banco real de 724 nomes, a NOSSA rubrica ganha (prefixo
lá nunca chega a forte; "jupiter" põe Io em 49º de 114 — as luas famosas
só aparecem por lista curada à mão). Para os 450 nomes do item 114,
adotar três coisas: keywords por corpo num degrau ~60 ("galileana",
"lua de Júpiter"), bloco de luas vindo da HIERARQUIA (não de lista
curada) e desempate por raio físico — o nosso desempate atual devolve 0
e "jupiter" enche os slots com "Jupiter LI…LXI" (medido). A cauda de
cometa virou receita portátil completa (doc 12 §B): três componentes de
um shader (poeira, íon 10× mais rápido e azulado, coma), aceleração
anti-Sol `mult·rand·n̂·K/r²` com K = 5,8475e13 km³·s^-1,5, deslocamento
`a·t^1,5`, alfa `√(1−√(t/T))`, corte além de 4,68 UA, ZERO afinação por
corpo (os 14 cometas do catálogo têm `comet:{}` vazio) — com as cinco
travas de integração declaradas (km→parsec, verbete no `escala.ts`,
corte pela pupila, renderOrder, origem móvel de tempo).

## O que NÃO trazer (consolidado, com o porquê nos docs)

Reparentagem e parentesco temporal (máquina de nave; 452 luas deles têm
pai fixo — censo); Dynamo inteiro (nossa cônica + oráculos ganham);
ordem ease∘compensação (mataria o ganho do item 110); tempo de parede
nas transições; lat/lon de câmera (polo); roll por pinça (nega "aviões
não voam de lado"); teto de taxa por quadro (perde até ~10 detentes/
quadro); tabelas curadas à mão (`_customSystemDistances`,
`_customRotations`); o bug dimensional `E*=1.3*fov` deles; matriz de
projeção manual (convenção de eixos própria); `gl_FragDepth` em todo
material; POINTS até 50 px (lei do Mac); índice Uint16 (teto de 65.535
estrelas); stories/kiosk/share/Toolbox/embed; escurecer a cena na
busca; WMTS ao vivo; `getRaycastColor` por canvas 2D; MSAA+depth pagos
em dobro no canvas (desperdício que nosso item 21 fechou — eles pagam);
Fuse.js e o limiar 0,05 (nossa rubrica ganha, medida); `featuredMoons`
curado; o `pioneer.setTime()` direto dos deep-links deles (a classe de
bug de dois donos do relógio que nosso item 108 matou); moment.js;
a convenção de eixos do shader deles (`w = viewPosition.y`).

## Pendências de prova desta mineração

- G1 é medida sintética: falta a captura no app vivo (alvo do lado
  oposto num degrau de corpo).
- Bloco B (samples:4): custo de GPU não medido; re-baseline de todos os
  gates de md5.
- Mergulhos 02/07: análises portadas e rodadas em CPU, não em GPU.
- Toast e tutorial do Eyes não dispararam na sessão viva (evidência é
  código + DOM).
- Achado avulso: docblock de `texturas.ts` (linhas ~25/272) afirma
  manifest de 3,44 MiB; o real mede 112.009 bytes (chip de conserto
  aberto).
- Rodada final: posições da busca não confirmadas no app vivo; custo de
  quadro da cauda de cometa não medido; voo ao ponto-entre da régua é
  leitura de código, não observação; o risco do AO VIVO×cessão (snap em
  ~30% das rampas de 300 ms) não foi confirmado na tela.

## Mapa dos artefatos (scratchpad, fora do git)

`mineracao/CHECKPOINT.md` (retomada), `censo-app.tsv`, `extrair.py`,
`fichas/lote-1..6`, `indice/`, `veredito-vendors.md`,
`mergulhos/01..09-*.md`, `mergulhos/medidas/*.py` (números
reproduzíveis), `mergulhos/capturas-08/*.png` (fotos conferidas pelo
coordenador).
