// ============================================================
// AS LINHAS DE ÓRBITA (item 77) — a camada `noorbitas`.
//
// A ÓRBITA É O DADO, NÃO ENFEITE. Sem elas o Atlas mostra dez pontos
// soltos e o visitante não tem como ler que Marte está entre a Terra e
// Júpiter; NASA Eyes, Celestia e SpaceEngine desenham as três. É a
// mesma família do MARCADOR do Sol e dos RÓTULOS: instrumento de
// leitura, não matéria — e por isso a linha não passa pela lei da luz
// (não é fóton de lugar nenhum), tem chave própria na tabela única e se
// declara no selo pela derivação de sempre.
//
// ------------------------------------------------------------
// 1. DE ONDE SAI A CURVA — e por que NÃO é "amostrar um período"
// ------------------------------------------------------------
// O contrato do item 77 pedia `posicaoHeliocentrica(id, jd + k·T/N)` ao
// longo de UM período. ESSE CAMINHO NÃO EXISTE, e a razão é a janela da
// tabela embarcada: `MotorEfemerides` cobre 1950–2050 e LANÇA fora dela
// (adaptação b de `efemerides.ts`, de propósito). Da época do retrato
// (2026) um período inteiro cai fora da janela em QUATRO dos nove
// planetas — Saturno (29,5 anos → 2055), Urano (84), Netuno (165) e
// Plutão (248). Amostrar para trás não salva: Urano em 1942 já está
// fora. Metade do sistema solar ficaria sem linha, para sempre.
//
// O QUE ESTA CAMADA FAZ EM VEZ DISSO: lê o ESTADO VIVO do corpo no
// instante vivo — posição E velocidade, as duas do mesmo motor, no
// mesmo `jd` — e desenha a CÔNICA OSCULADORA que esse estado define. É
// o que "linha de órbita" significa nos três programas de referência: a
// elipse que o corpo percorreria a partir de agora sob dois corpos.
//
// E ELA CUMPRE O QUE O CONTRATO QUERIA GARANTIR, mais forte do que a
// amostragem cumpriria: o vértice 0 do laço é, por construção
// algébrica, a posição VIVA do corpo (a anomalia excêntrica do vértice
// 0 é a do próprio estado lido). Linha e ponto não divergem no primeiro
// salto de data porque não podem divergir em data nenhuma — não é
// tolerância, é identidade. O retrato congelado não entra aqui em
// nenhum caminho: sem efeméride viva esta camada não desenha NADA (§6).
//
// ------------------------------------------------------------
// 2. A CÔNICA, em vetores — sem resolver Kepler
// ------------------------------------------------------------
// Com `r` (UA) e `v` (UA/dia) parent-centered e `μ` do centro:
//     a  = 1 / (2/|r| − |v|²/μ)                        (vis-viva)
//     e⃗ = (v⃗ × h⃗)/μ − r̂,  h⃗ = r⃗ × v⃗                  (Laplace-Runge-Lenz)
//     P̂ = ê (para o periastro),  Q̂ = ĥ × P̂
//     r⃗(E) = a(cos E − e)·P̂ + a√(1−e²)·sin E·Q̂
// Amostrar E uniformemente (e não a anomalia verdadeira) é o que
// concentra vértice onde a curva dobra — no periastro —, que é onde
// 256 segmentos precisam estar. E a fase de partida é a do corpo:
//     cos E₀ = (r⃗·P̂)/a + e ,  sin E₀ = (r⃗·Q̂)/(a√(1−e²))
// com E = E₀ + k·2π/N. O vértice 0 volta a ser `r⃗`, exatamente.
//
// NÃO SE RESOLVE A EQUAÇÃO DE KEPLER aqui, e é por isso que não há
// segunda cópia de `elementosParaCartesiano` (`lib/atlas/kepler.ts`):
// aquela função vai de ELEMENTOS + anomalia MÉDIA a cartesiano, e o
// caminho médio→excêntrico é justamente o iterativo que esta camada não
// precisa percorrer. Aqui a curva é varrida em E, que é o parâmetro
// natural da elipse. As duas escrevem a mesma cônica; o teste
// (`orbitas.test.ts`) cobra que o laço passe pelo ponto do motor.
//
// ------------------------------------------------------------
// 3. O μ, e a checagem independente
// ------------------------------------------------------------
// `μ = G(M_centro + M_corpo)` sai de `GM_CORPOS` (`lib/atlas/massas.ts`,
// os `BODY<n>_GM` do kernel gm_de440), convertido de km³/s² para
// UA³/dia². É a MESMA tabela que a ficha do objeto usa para massa e
// gravidade — não nasce um segundo cadastro de massa aqui.
//
// A conferência independente está pinada em teste: o μ do Sol assim
// derivado bate com `MU_SUN_AU3_PER_DAY2` (= k², a constante gaussiana
// de 1976, de procedência inteiramente outra) e os μ dos seis pais
// batem com `MU_PARENT` dentro de 1e-3 — a diferença que resta é a
// massa das luas que o `MU_PARENT` inclui no valor de SISTEMA e o
// `BODY<n>_GM` do planeta não. 1e-3 em μ é 3e-4 no semieixo: nada que
// chegue a um pixel.
//
// ------------------------------------------------------------
// 4. LUA GIRA NO PAI, não no Sol
// ------------------------------------------------------------
// O laço é sempre PARENT-CENTERED (`posicao`, não
// `posicaoHeliocentrica`) e o objeto do three é POSICIONADO no centro
// vivo. Para os heliocêntricos o centro é a origem da cena e os dois
// caminhos são o mesmo; para as 21 luas a diferença é tudo: a posição
// heliocêntrica da Lua ao longo de um mês desenha um festão em volta do
// SOL — a Terra anda 27° no mesmo tempo —, e não a elipse em volta da
// Terra que o visitante veio ler.
//
// ------------------------------------------------------------
// 5. O DESENHO — e quem manda a linha sumir
// ------------------------------------------------------------
// A LINHA É UMA FITA (item 83 · L2), aditiva, sem escrever profundidade
// e TESTANDO profundidade (linha atrás de globo resolvido some, como
// deve). Até 24/08 era `LineLoop` + `LineBasicMaterial`: `linewidth` é
// IGNORADO em WebGL — sempre 1 pixel de DISPOSITIVO —, e num Retina isso
// é meio pixel CSS, fio de teia serrilhado. Não havia número a mexer; era
// troca de primitiva.
//
// Hoje é `LineSegments2` + `LineMaterial` (o caminho `Line2` dos
// exemplos do three, MIT, vivo em r185): um quad instanciado por
// segmento, expandido em clip space, com junta resolvida. A largura é
// `LARGURA_DA_FITA_PX`, em pixels CSS.
//
// POR QUE A LARGURA É EM PIXEL CSS, e não de dispositivo: desde r165 o
// `LineSegments2.onBeforeRender` escreve o `resolution` sozinho a partir
// de `renderer.getViewport()`, que o three guarda em unidades CSS (a
// multiplicação pelo pixelRatio acontece depois, no `gl.viewport`). A
// fita sai com a MESMA grossura aparente em 1×, 1,5× e 2× — que é
// exatamente a invariância que a casa já exige do clarão. NÃO SE ESCREVE
// `resolution` no resize: escrever à mão é reintroduzir o bug que o
// upstream fechou.
//
// O ANTI-ALIASING É O DA CASA, e a escolha é declarada: `alphaToCoverage`
// do `LineMaterial` depende de MSAA, e ESTA CASA NÃO TEM MSAA — o
// renderer nasce com `antialias: false` e o AA vem do supersampling por
// pixelRatio (`core/engine.ts`), com os alvos do composer sem `samples`.
// Ligar a chave escreveria uma cobertura que ninguém amostra. O que a
// beira da fita ganha em vez disso é a SAIA do §5d — suavização
// analítica DENTRO da linha, e só nela. O `logdepthbuf` que o
// `LineMaterial` traz fica inerte porque a casa não usa profundidade
// logarítmica.
//
// ------------------------------------------------------------
// 5e. A JUNTA EM BISSETRIZ (item 83 · B2, o A4)
// ------------------------------------------------------------
// A QUEIXA DELE, em 26/08: *"lá a órbita parece uma FITA DOBRADA, não uma
// LINHA GROSSA; a nossa ainda parece linha grossa"*. É aqui que essa
// diferença mora, e ela é de geometria, não de brilho.
//
// O `LineMaterial` desenha cada segmento como um quad e empurra as duas
// pontas na PERPENDICULAR DAQUELE segmento. Numa reta os quads casam; numa
// CURVA não: os dois quads que se encontram numa junta empurram em
// direções diferentes, então por FORA da curva abre uma CUNHA e por
// DENTRO os dois se sobrepõem e dobram tinta. O olho lê o resultado como
// uma sucessão de retas grossas — uma linha grossa. Uma fita de verdade
// VINCA: as duas faces encontram-se na quina, sem fenda e sem dobra.
//
// A CURA É A BISSETRIZ, e a fórmula é pública (SVG, Canvas, Cesium) e é
// a mesma que a referência usa: em vez da perpendicular do segmento,
// empurra-se na bissetriz das DUAS perpendiculares, esticada pelo inverso
// do cosseno da metade do ângulo — `escalaDaBissetriz`. Sem o esticão a
// fita AFINA na dobra; com ele o canto externo encosta exatamente na
// quina.
//
// O QUE ISSO CUSTA são DOIS ATRIBUTOS: o ponto ANTES do início e o ponto
// DEPOIS do fim de cada segmento. Eles moram no MESMO buffer interleaved
// (`PASSO_DA_FITA` = 12), escritos pela MESMA passada de `espelharNaFita`
// — a disciplina do §5 continua inteira e nada realoca no quadro.
//
// NÃO É FITA NOVA. A estrutura de quads por segmento é a que a casa já
// tinha; o que muda é para onde o vertex empurra a ponta. O corte no near
// plane, o `resolution` automático, o `discard` da calota do §5c e o
// `raycast` sobrevivem — a conta portou-se, a fita não se reconstruiu.
// `Line2` NÃO seria atalho: lá as calotas continuam.
//
// ------------------------------------------------------------
// 5f. O GRADIENTE AO LONGO DO LAÇO (item 115, bloco B; R3 do mergulho 08)
// ------------------------------------------------------------
// A FITA ERA CHAPADA: um alfa para o laço inteiro. A do NASA Eyes tem
// gradiente ao longo do rastro — mais viva perto do corpo, esvaindo
// atrás —, e é isso que faz o olho ler a DIREÇÃO do movimento.
//
// A porta é a que o próprio `LineMaterial` abre: `instanceColorStart/End`
// com `vertexColors`, e o `<color_fragment>` do three multiplicando
// `diffuseColor.rgb`. Em blending ADITIVO multiplicar a cor é
// multiplicar a contribuição — o mesmo produto que um alfa por vértice
// daria, e alfa por vértice o material não tem (ver o §5 acima).
//
// CUSTA ZERO POR QUADRO, e é consequência da álgebra do §2: o vértice 0
// É a posição viva do corpo, então a distância de cada vértice ao corpo
// não muda NUNCA. O buffer é escrito uma vez, na construção, e é o mesmo
// objeto para as trinta linhas. Quem anda é o laço; o ponto claro anda
// com ele de graça. Ver `gradienteDaFita` para a curva e os dois números.
//
// ------------------------------------------------------------
// 5d. A SAIA DO AA E A LARGURA NA JANELA (item 83 · A2 + A3)
// ------------------------------------------------------------
// A BEIRA LISA DA REFERÊNCIA É MSAA DE CARTÃO — duas camadas, 4× no alvo
// de render mais o AA do canvas — e ZERO suavização no shader de linha
// deles. Esta casa não liga MSAA; imita-se o RESULTADO, e só na linha.
//
// A IDEIA É DE LIVRO (GPU Gems, Cesium): a caneta é um pouco mais larga
// do que o traço que se quer ver, e o excedente some numa rampa. O
// material nasce com `LARGURA_DA_FITA_PX + SAIA_DO_AA_PX`; no fragmento,
// `u = |vUv.x|` corre de 0 (eixo da fita) a 1 (beira do quad INCHADO), e
// o alfa cai de 1 a 0 entre o `uMiolo` e essa beira. Não é tubo, e o
// `sqrt(1−u²)` que a leitura de 24/08 propôs está proibido (a referência
// é chapada: `glowWidth = 0` devolve `edgeGlow() = 1`).
//
// O MIOLO É CHAPADO QUANDO HÁ LARGURA PARA ELE, e a frase precisa desta
// metade — dizê-la em termos absolutos era mentira, e uma auditoria a
// pegou em 26/08. A rampa começa em `uMiolo − fwidth(u)`, e o `fwidth`
// cresce quando a fita tem POUCOS pixels de dispositivo. O limiar tem
// número, e são DOIS porque `fwidth` depende da inclinação: sobra platô
// acima de **3,60 px de dispositivo** na fita inchada quando ela corre
// alinhada aos eixos, e acima de **5,09 px** quando corre a 45°. Abaixo
// disso a rampa toma a fita inteira e o que se garante é o CENTRO
// PLENO, nunca menos que `BRILHO_DA_LINHA`. Em `pixelRatio` 2 e janela
// de referência a fita inchada dá 4,5 px: tem platô no arco alinhado e
// NÃO tem no arco a 45° — e toda elipse tem os dois. Quem garante o
// centro é o grampo em zero (`perfilDaSaia`), e ele existe porque sem
// ele o regime fino perdia 15,6% de brilho no eixo — perfil através da
// largura, exatamente o que se proibiu.
//
// E O REGIME FINO É ALCANÇÁVEL, não hipótese: o preset `performance` do
// `core/engine.ts` tem `pixelRatio` 1,0 — por `?q=performance`, por
// auto-degradação abaixo de 34 fps, e em qualquer monitor não-Retina,
// onde `min(devicePixelRatio, preset)` dá 1.
//
// A LARGURA CRESCE COM A JANELA, e é o único fator: `max(1, min(lado
// CSS)/800)`, o mesmo da referência. Numa janela pequena o fator é 1 e
// a fita é a de sempre; numa janela grande ela engrossa junto com tudo o
// mais que o olho vê maior. DUAS ARMADILHAS moram aqui, e as duas já
// custaram pixel nesta casa: (i) o `QuadroEmPx` fala em px de
// DISPOSITIVO — dividir pelo `pixelRatio` antes de comparar com 800, ou
// um Retina de 1200 CSS mediria 2400 e a fita sairia com o dobro do
// fator; (ii) a SAIA SOMA DEPOIS do fator — ela é 1 px CSS de rampa em
// qualquer janela, não uma fração da largura.
//
// E POR ISSO O `uMiolo` É UNIFORM, e não literal no GLSL: com o fator da
// janela em cima da largura e a saia fixa por baixo, a fração
// `visível/(visível+saia)` MUDA de janela para janela — 1,25/2,25 numa
// tela de 800, 1,40625/2,40625 numa de 1200. Literal, o miolo mentiria
// em toda janela grande e a largura visível deixaria de ser a que o §5
// promete. `larguraVisivelDaFitaPx` é a fonte única dos dois números: o
// que vai para o `linewidth` e o que vai para o `uMiolo` saem da mesma
// chamada, no mesmo quadro.
//
// ------------------------------------------------------------
// 5c. A JUNTA SEM CONTA (item 83 · A1, o L2.5-a)
// ------------------------------------------------------------
// A FITA TINHA UM COLAR DE CONTAS, e era defeito MEDIDO: no recorte de
// 340 colunas da foto de zoom do L2, 54 tinham pico ≥ 215, em grupos de
// vão rigorosamente CONSTANTE. A causa está no quad: cada segmento
// nasce com CALOTA REDONDA além das duas pontas, a calota do segmento
// *k* cobre o corpo do *k+1*, e em aditivo o disco da junta é pintado
// DUAS vezes (204 → 230). A 1× é sutil; num Retina, é o colar.
//
// O DENTE DE CONTINUIDADE NÃO PEGAVA ISTO, e não era frouxidão dele: ele
// cobra o BUFFER (o fim de um segmento é o começo do próximo, bit a
// bit), e isso segue verdadeiro. O defeito nasce DEPOIS, na expansão do
// quad dentro do shader. Buffer certo, desenho duplo.
//
// A CURA SÃO TRÊS CHAVES DO PRÓPRIO THREE, e não um shader nosso:
// `dashed: true` liga o `USE_DASH`, cujo fragmento começa por
// `if (vUv.y < -1.0 || vUv.y > 1.0) discard` — a calota morre ali, antes
// de qualquer conta. `gapSize: 0` faz a segunda linha do mesmo bloco
// (`mod(d, dashSize + gapSize) > dashSize`) nunca ser verdadeira, porque
// o resto de `mod` vive em `[0, dashSize)`: NÃO SE TRACEJA NADA.
// `dashSize: 1` é o padrão, e nunca zero — `mod(x, 0)` é indefinido.
// O que sobra na dobra externa vale `w·tan(θ/2) ≈ 0,015 px`.
//
// E O `USE_DASH` COBRA UM ATRIBUTO: `instanceDistanceStart/End`, que só
// existe depois de `computeLineDistances()`. Ela é chamada UMA vez, no
// construtor, com as posições ainda zeradas — e servem, porque com
// `gapSize` zero a distância não decide nada. **NUNCA em `reamostrar`:**
// aquela função roda a cada salto de data, e `computeLineDistances`
// aloca um `InstancedInterleavedBuffer` NOVO a cada chamada — seria o
// mesmo desperdício que a disciplina do buffer (§5) existe para evitar,
// todo quadro com o relógio andando.
//
// A CESSÃO AO NÚCLEO CONTINUA INTEIRA: o `discard` do `USE_DASH` roda
// ANTES do `gl_FragColor` que a cirurgia de `cederAoNucleo` procura, e a
// substituição de texto não toca nele.
//
// QUEM MEDE ISTO É `scripts/visual/colar-da-fita.mjs`, no Retina e com o
// relógio ANDANDO — a vista parada não prova um defeito que só existe
// enquanto o laço é reescrito.
//
// TRINTA OBJETOS, E NÃO UM — o "1 draw call" que o estudo oferecia de
// brinde foi MEDIDO CONTRA O QUE CUSTAVA, e não se paga:
//   - a ORIGEM FLUTUANTE morreria. Os vértices são relativos ao centro e
//     só a MATRIZ anda por quadro, em double na CPU (§4). Concatenar os
//     laços obrigaria a assar a posição do pai em cada vértice — e a
//     órbita de Io é 1e-8 pc ao lado de um centro a 5,2 UA, que float32
//     não resolve — e a reescrever o buffer a cada quadro em que o pai
//     anda, que é todo quadro com o relógio ligado.
//   - o ALFA É POR LINHA. O fade das duas pontas e o realce do foco
//     (§5b) dão um alfa DIFERENTE a cada laço, e no `LineMaterial` o
//     alfa é um uniform global (issue #23680, aberta desde 2022). Um
//     objeto só exigiria a receita de alfa por vértice que o item 83
//     reserva ao L4. (Desde 31/08 há modulação POR VÉRTICE — o gradiente
//     do §5f —, e ela não muda esta conta: entra pela COR, que o
//     `LineMaterial` interpola por instância, e o alfa do laço continua
//     sendo um número só.)
// O que se perde é nada: já eram 30 draw calls, e continuam 30 — só as
// ACESAS desenham.
//
// A COR É O DADO, O BRILHO É O INSTRUMENTO. O matiz sai da fotometria
// da casa (`FOTOMETRIA[id].corLinear`, o RGB linear de albedo por
// banda) NORMALIZADO no canal mais forte: assim a órbita de Marte é
// ferrugem e a de Netuno é azul, mas nenhuma delas fica mais fraca que
// a outra por ter albedo menor — brilho de linha é escolha de
// instrumento, e uma só. Lua herda o matiz do pai — é assim que o olho
// lê "estas quatro são de Júpiter" sem um rótulo em cima de cada uma.
//
// O FADE É POR TAMANHO ANGULAR, nas duas pontas, e cada ponta responde
// a uma pergunta diferente:
//   - EMBAIXO: abaixo de uns poucos pixels a elipse é um rabisco em
//     cima do próprio ponto do corpo — pior que nada, porque suja a
//     fotometria que a camada dos planetas mede.
//   - EM CIMA: quando a órbita não CABE no quadro ela deixa de ser uma
//     órbita e vira um risco atravessando o céu — e o caso extremo é a
//     CÂMERA DENTRO DO LAÇO, onde a órbita envolve o observador e não
//     há lente que a enquadre. Por isso esta ponta é medida em ÂNGULO,
//     e não pela aproximação `r/d`: o porquê mora em `alfaDa`, junto do
//     corte. É o que mantém limpas as vistas de corpo.
// As luas ainda pedem o PAI ENQUADRADO: fora do quadro o pai não dá
// referência nenhuma, e a elipse solta seria um anel sem dono.
//
// ------------------------------------------------------------
// 5b. O FOCO MANDA NA CENA (item 83 · L1)
// ------------------------------------------------------------
// Quando o visitante enquadra um corpo, a órbita DELE — e as das LUAS
// dele — sobem, e as demais recuam um passo. É um MULTIPLICADOR por
// linha em cima do alfa do fade, e não um segundo alfa: as duas pontas
// do §5 continuam decidindo quem tem direito a aparecer, e o realce só
// decide QUEM É O ASSUNTO entre as que já apareceram. Sem foco nenhum —
// a abertura, o filme, toda vista de bancada — o multiplicador é 1 e
// esta seção não existe para o pixel.
//
// A FAMÍLIA é derivada, nunca digitada: `id === foco` (o alvo) ou
// `centro === foco` (as luas dele). Enquadrar Júpiter acende as quatro
// galileanas junto porque elas têm Júpiter como centro, e enquadrar Io
// acende só Io — as três irmãs recuam, que é o que faz o olho achar a
// que o visitante pediu.
//
// A TRANSIÇÃO É SUAVE, e não é enfeite: trocar de alvo com corte seco
// faz as trinta linhas piscarem juntas. O realce persegue o alvo por
// decaimento exponencial (o idioma de `zoomDaRoda`), e ENCOSTA quando
// chega perto — sem o encosto ele convergiria para sempre e a régua
// abaixo nunca assentaria.
//
// E ELE ENTRA NA PRONTIDÃO DA CAPTURA (`animando`, lido pelo `captura`
// do director): realce ainda andando é cena mudando, exatamente como o
// véu do Atlas e a rampa do rig. Sem esse termo, um `?foco=` fotografado
// no meio da transição devolveria md5 diferente a cada corrida — a
// captura mediria a corrida, e não a imagem.
//
// ------------------------------------------------------------
// 6. SEM EFEMÉRIDE, SEM LINHA — a decisão escrita
// ------------------------------------------------------------
// A efeméride é preguiçosa (`maquinaDoTempo.garantirEfemerides`) e o
// filme só a paga na coda. Esta camada NÃO abre uma segunda porta de
// download: enquanto o motor não chegar, ela não tem estado vivo para
// ler e fica vazia. Desenhar a partir do retrato congelado seria
// exatamente o defeito que o contrato do item 77 proíbe pelo nome —
// linha de 2026 sob ponto de 2035 — e desenhar a partir de uma tabela
// de elementos própria seria a segunda fonte de verdade da órbita.
//
// O CASO OBSERVÁVEL, dito para ninguém o descobrir como bug: um
// deep-link de `?pos=` SEM `?jd=` não acende efeméride nenhuma, e
// portanto não tem linha — é a fase `free` das vistas de bancada. O
// `atlas-smoke` DEPENDE disso: a prova `?jd=EPOCA é NEUTRA` compara o
// retrato congelado contra a efeméride viva na época, e a vista dela
// leva `&noorbitas=1` justamente porque as linhas só existiriam de um
// dos dois lados.
//
// E no Atlas o comum é HAVER linha, não o certo: quem acende a
// efeméride ao entrar é o `palcoQuente`, e ela chega pela REDE. Sem
// rede a máquina do tempo fica em `indisponivel`, os dez corpos ficam
// no retrato e esta camada fica vazia junto — degradação declarada, do
// mesmo feitio da que o HUD já anuncia ao visitante.
//
// ------------------------------------------------------------
// 7. O FILME NÃO TEM LINHA — a exceção que ELE autorizou
// ------------------------------------------------------------
// Na coda o filme paga a efeméride, e a partir daí as linhas apareciam
// dentro do filme — foi assim que ele as viu, na volta para casa
// (`capturas/item77-filme-volta-para-casa.png`). A decisão 3 do item 77
// é dele, de 25/08: *"tirar do filme (aceito recriar a separação entre
// modos só aí)"*.
//
// É A ÚNICA REGRA POR MODO VIVA DA CASA, e o "só aí" é o tamanho dela: o
// item 61 matou todas as outras com lápide, e nada aqui as ressuscita. A
// doutrina inteira — de que lei isto é exceção, quem a autorizou e por
// que ninguém a estende para brilho, lente, nomes ou bloom — mora em
// `fases.ts`, no `LINHAS_DE_ORBITA_POR_FASE`. Aqui fica só o consumo.
//
// A GAVETA NÃO PERDE NADA: o `noorbitas` continua governando a camada no
// Atlas e no voo livre, exatamente como antes. O gate MULTIPLICA-SE com
// ele; não o substitui.
// ============================================================
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { AU_PARA_PC, eclipticaParaEquatorial } from '../../lib/atlas/frameGalactico';
import { AU_KM } from '../../lib/atlas/elementosOrbitais';
import { GM_CORPOS } from '../../lib/atlas/massas';
import { CORPOS_DO_SISTEMA, LUAS_DO_SISTEMA } from '../atlasConfig';
import { COR_DA_TEXTURA } from './planetas/corDaTextura';
// A EXCEÇÃO DO §7, e é o único import de FASE em toda a pasta `world/`.
// Ele está aqui por autorização nomeada dele (item 77, decisão 3); o
// mapa carrega a doutrina e `fases.test.ts` varre a árvore para que este
// arquivo continue sendo o único a consumi-lo.
import { LINHAS_DE_ORBITA_POR_FASE } from '../fases';
import type { Phase } from '../fases';
import { FOTOMETRIA, IDS_FOTOMETRIA } from './planetas/fotometria';

/** segundos num dia — o fator da conversão de μ, escrito uma vez */
const SEGUNDOS_POR_DIA = 86_400;

/**
 * μ de km³/s² para UA³/dia², a unidade em que a efeméride fala. O
 * conversor de distância é o `AU_KM` único da casa (o mesmo de
 * `escala.kmParaPc`), nunca um segundo 149.597.870,7.
 */
export function muEmUaDia(gmKm3PorS2: number): number {
  return (gmKm3PorS2 * SEGUNDOS_POR_DIA * SEGUNDOS_POR_DIA) / (AU_KM * AU_KM * AU_KM);
}

/**
 * O μ de dois corpos do problema relativo: o centro MAIS o corpo que
 * gira nele. Para um planeta em torno do Sol a segunda parcela é ruído
 * (1e-6 em Júpiter); para a Lua em torno da Terra ela vale 1,2% de μ, e
 * ignorá-la deixaria a elipse 0,4% grande.
 *
 * O `?? 0` é para a ausência que a casa JÁ DECLARA num lugar só —
 * `SEM_GM_NO_KERNEL` (`lib/atlas/massas.ts`), e ela tem um único nome
 * hoje. Redigitar a lista aqui seria a segunda cópia de sempre; o que
 * este comentário promete é só que o corpo sem GM cai num zero em vez
 * de num NaN. Quem entra nesse ramo é heliocêntrico, onde a própria
 * massa não muda o semieixo em nada que chegue a um pixel.
 */
export function muDoPar(centro: string, corpo: string): number | null {
  const gmCentro = GM_CORPOS[centro];
  if (gmCentro === undefined) return null;
  return muEmUaDia(gmCentro + (GM_CORPOS[corpo] ?? 0));
}

/** Quantos vértices tem um laço. 256 é o número do contrato do item 77. */
export const PONTOS_POR_ORBITA = 256;

/**
 * O PISO DO GRADIENTE DA FITA (item 115, bloco B, peça 3) — quanto sobra
 * do brilho no fim da cauda.
 *
 * 0,35 é o número do mergulho 08 (R3, `alfa = lerp(0,35 , 1,0 , …)`), e
 * ele não é zero por uma razão de produto: a linha de órbita é DADO, não
 * enfeite (§1). Apagá-la do outro lado do laço tiraria do visitante
 * justamente o que ela existe para dizer — que Marte está entre a Terra
 * e Júpiter. O gradiente é para LER a fita melhor, não para ter menos
 * fita.
 */
export const PISO_DO_GRADIENTE = 0.35;

/**
 * QUANTO DO LAÇO, À FRENTE DO CORPO, CAI ATÉ O PISO (item 115, peça 3).
 *
 * Um quarto. É este número que faz a fita ter DIREÇÃO: à frente do corpo
 * ela apaga depressa, atrás dela sobe devagar pelos três quartos
 * restantes até reencontrar o corpo cheio. O olho lê uma cauda cuja
 * cabeça é o planeta — que é o que o dono chamou de fita ("mais viva
 * perto do corpo, esvaindo atrás").
 *
 * POR QUE NÃO O SIMÉTRICO DO MERGULHO (`m = ângulo/π`, mínimo no lado
 * oposto): simétrico entrega o fade e o ponto claro que ANDA com o
 * planeta, mas não entrega direção nenhuma — os dois lados da fita ficam
 * iguais. E por que não o degrau seco do `TrailComponent` deles (cauda
 * que nasce no corpo e some, sem nada à frente): num laço FECHADO isso é
 * uma emenda visível de piso para cheio entre dois vértices vizinhos, a
 * 1,4° um do outro. Este número é o meio-termo que mantém a curva
 * CONTÍNUA em toda a volta — o mínimo fica a um quarto à frente em vez
 * de ficar colado no corpo.
 */
export const FRACAO_A_FRENTE_DO_GRADIENTE = 0.25;

/**
 * O GRADIENTE NO VÉRTICE `k` de um laço de `n` (item 115, bloco B, R3 do
 * mergulho 08).
 *
 * ELE É FUNÇÃO DO ÍNDICE, E SÓ, e é isso que o faz custar zero por
 * quadro: o vértice 0 do laço É a posição VIVA do corpo, por construção
 * algébrica (§1 e `escreverLaco`: `anomalia = anomalia0 + k·2π/n`, com
 * `anomalia0` lida do estado do corpo). Então "a que distância do corpo
 * está este vértice" não muda nunca — quem anda é o LAÇO, reescrito a
 * cada salto de data, e o ponto claro anda junto de graça. Um gradiente
 * ancorado em posição de mundo pediria um buffer de cor reescrito por
 * quadro; este é escrito UMA vez, na construção, e é o MESMO para as
 * trinta linhas.
 *
 * `k` cresce na DIREÇÃO DO MOVIMENTO — a anomalia excêntrica cresce com
 * o tempo, e o par `P̂`/`Q̂` sai de `h⃗ = r⃗ × v⃗`, que é o sentido real do
 * corpo (as retrógradas como Tritão saem certas sozinhas).
 */
export function gradienteDaFita(k: number, n: number): number {
  const u = (((k % n) + n) % n) / n;
  const f =
    u <= FRACAO_A_FRENTE_DO_GRADIENTE
      ? 1 - u / FRACAO_A_FRENTE_DO_GRADIENTE
      : (u - FRACAO_A_FRENTE_DO_GRADIENTE) / (1 - FRACAO_A_FRENTE_DO_GRADIENTE);
  return PISO_DO_GRADIENTE + (1 - PISO_DO_GRADIENTE) * f;
}

/**
 * O BUFFER DE COR DA FITA — `instanceColorStart`/`instanceColorEnd` do
 * `LineMaterial`, no layout dele (passo 6: rgb do início, rgb do fim).
 *
 * CINZA, NUNCA MATIZ: a cor da órbita continua sendo o uniform `color`
 * do material (a fotometria da casa, §5), e o `<color_fragment>` do three
 * MULTIPLICA — então o que viaja aqui é só o fator do gradiente,
 * escrito nos três canais. Matiz por vértice seria uma segunda fonte
 * para a cor da linha.
 *
 * O segmento `k` liga o ponto `k` ao ponto `k+1` (ver `espelharNaFita`),
 * e por isso o fim do segmento é o gradiente do ponto seguinte.
 */
function corDoGradienteDaFita(n: number): Float32Array {
  const cores = new Float32Array(n * 6);
  for (let k = 0; k < n; k++) {
    const inicio = gradienteDaFita(k, n);
    const fim = gradienteDaFita(k + 1, n);
    cores[k * 6] = inicio;
    cores[k * 6 + 1] = inicio;
    cores[k * 6 + 2] = inicio;
    cores[k * 6 + 3] = fim;
    cores[k * 6 + 4] = fim;
    cores[k * 6 + 5] = fim;
  }
  return cores;
}

/**
 * A LARGURA DA FITA, em PIXELS CSS (§5, item 83 · L2).
 *
 * 1,25 é o número do NASA Eyes, e ele foi medido por DOIS métodos
 * independentes que fecharam (`docs/reference/estudo-orbitas-eyes-observacao.md`):
 * a COBERTURA lida do pixel da tela deles — níveis em 0,25/0,50/0,75/1,00
 * sobre ~2,5 px de dispositivo a DPR 2 — e a leitura da API do motor. A
 * nossa tinha 1 px de DISPOSITIVO, que num Retina é 0,5 px CSS: a deles
 * era 2,5× mais grossa.
 *
 * AQUELES QUARTOS NÃO SÃO PERFIL, e a primeira redação disto errava: a
 * faixa deles é CHAPADA (`glowWidth = 0` devolve `edgeGlow() = 1`), e os
 * níveis em quartos exatos são MSAA (`antialias: true`) sobre borda
 * DURA. A nossa borda também é dura; quem a suaviza é o downsample do
 * supersampling, no fim da cadeia. O que nos separa é o AA da borda, não
 * um perfil na largura.
 *
 * NÃO CONFUNDIR COM RAIO: no shader do `LineMaterial` o `linewidth` é a
 * largura CHEIA (o offset do quad é metade dele para cada lado).
 */
export const LARGURA_DA_FITA_PX = 1.25;

/**
 * A SAIA DO ANTI-ALIASING, em pixels CSS de largura TOTAL (§5d, item
 * 83 · A2) — meio pixel para cada lado.
 *
 * Ela é o que a caneta ganha ALÉM do traço visível para poder terminar
 * numa rampa em vez de num degrau. `LARGURA_DA_FITA_PX` continua sendo a
 * largura VISÍVEL — o número medido no pixel da referência —, e é por
 * isso que a saia é uma constante SEPARADA e não um 2,25 digitado: quem
 * ler o §5 e quiser saber quão grossa a fita aparece continua achando
 * 1,25, e quem mexer no AA não mexe na largura.
 *
 * 1 px é o mínimo que cobre um pixel inteiro de rampa em qualquer tela:
 * menos que isso e a rampa não tem onde acontecer no downsample da casa;
 * mais que isso e a fita ganha um halo que a referência não tem.
 *
 * O QUE ELA NÃO PROMETE, e a distinção é medida (§5d): que o miolo fique
 * CHAPADO em toda tela. A rampa começa em `uMiolo − fwidth(u)`, e o
 * `fwidth` cresce quando a fita tem poucos pixels de DISPOSITIVO — sobra
 * platô acima de 3,60 px na fita inchada com ela alinhada aos eixos, e
 * acima de 5,09 px com ela a 45°; abaixo disso a rampa toma a fita
 * inteira. O que a saia garante em QUALQUER densidade é o CENTRO PLENO,
 * e quem o garante é o grampo em zero de `perfilDaSaia`.
 */
export const SAIA_DO_AA_PX = 1;

/**
 * A JANELA DE REFERÊNCIA da largura (§5d, item 83 · A3): abaixo deste
 * lado menor a fita não encolhe, acima dele cresce na mesma proporção. É
 * o 800 medido no motor da referência, e não um número desta casa.
 */
const JANELA_DE_REFERENCIA_PX = 800;

/**
 * A LARGURA VISÍVEL DA FITA neste quadro, em px CSS (§5d · A3) — o `px`
 * da receita, ANTES de somar a saia.
 *
 * É PURA E EXPORTADA de propósito: a conta tem duas armadilhas (o
 * `pixelRatio` e a ordem da soma da saia) e nenhuma das duas se afere
 * abrindo um navegador. Quem a chama são o `update` — que a converte em
 * `linewidth` e em `uMiolo` na mesma linha — e o teste, que cobra os
 * DOIS números.
 *
 * O `?? 1` do ratio não é defesa contra o desconhecido: é o quadro de
 * teste que passa `pixelRatio` zero antes do primeiro resize, e dividir
 * por zero devolveria uma fita infinita em vez de uma fita de 1,25.
 */
export function larguraVisivelDaFitaPx(quadro: QuadroEmPx): number {
  const ratio = quadro.pixelRatio > 0 ? quadro.pixelRatio : 1;
  const ladoMenorCss = Math.min(quadro.larguraPx, quadro.alturaPx) / ratio;
  const fator = Math.max(1, ladoMenorCss / JANELA_DE_REFERENCIA_PX);
  return LARGURA_DA_FITA_PX * fator;
}

/**
 * O PERFIL DA SAIA ATRAVÉS DA LARGURA (§5d) — a MESMA conta que o
 * fragmento faz, em TypeScript, para uma máquina sem GPU poder julgá-la.
 *
 * `u` é a distância ao eixo em frações da meia largura INCHADA (0 no
 * eixo, 1 na beira do quad); `miolo` é onde a rampa começaria; `pixel` é
 * o `fwidth(u)`, o tamanho de um pixel de dispositivo nessa mesma régua.
 * Devolve o multiplicador do alfa, de 1 (fita cheia) a 0 (céu).
 *
 * O GRAMPO EM ZERO É O CONSERTO DE 26/08, e ele nasceu de uma medida: sem
 * ele, quando `pixel` passa do `miolo` o começo da rampa fica NEGATIVO e
 * o `smoothstep` já morde o EIXO da fita — em `pixelRatio` 1, com a fita
 * inchada valendo 2,25 px de dispositivo, `fwidth` dá 0,889 contra um
 * miolo de 0,556, o começo cai em −0,333 e o centro perde **15,6% de
 * brilho**. Isso é exatamente o perfil através da largura que o item 83
 * proíbe, e chegava por um caminho que ninguém tinha fotografado.
 *
 * E O REGIME É ALCANÇÁVEL, não teórico: o preset `performance` do
 * `core/engine.ts` tem `pixelRatio` 1,0 — por `?q=performance`, por
 * auto-degradação abaixo de 34 fps, e em QUALQUER monitor não-Retina,
 * onde `min(devicePixelRatio, preset)` dá 1.
 *
 * O QUE O GRAMPO NÃO FAZ é devolver o platô: com 2,25 px de dispositivo
 * não HÁ largura para um platô, e o que se ganha é o centro pleno com a
 * rampa tomando a fita inteira — o melhor que essa densidade permite.
 * Onde a fita é grossa o bastante, o grampo não muda nada, porque ali o
 * começo da rampa já era positivo.
 */
export function perfilDaSaia(u: number, miolo: number, pixel: number): number {
  const inicio = Math.max(miolo - pixel, 0);
  const t = Math.min(1, Math.max(0, (Math.abs(u) - inicio) / (1 - inicio)));
  return 1 - t * t * (3 - 2 * t);
}

/**
 * O `fwidth(u)` que a GPU verá, dado quantos px de DISPOSITIVO a fita
 * inchada ocupa. `u` corre 0→1 ao longo de MEIA largura, então o
 * gradiente vale `2/largura`; e `fwidth` é `|dFdx| + |dFdy|`, que para
 * uma fita a 45° chega a `√2` vezes o gradiente e para uma alinhada aos
 * eixos vale exatamente ele.
 *
 * O PIOR CASO É O DE 45°, e é por ele que o dente cobra: uma fita de
 * órbita cruza todas as inclinações ao longo do laço, então o regime
 * ruim acontece em algum arco de TODA elipse desenhada.
 */
export function pixelDaSaia(larguraInchadaEmDispositivo: number, diagonal = false): number {
  const gradiente = 2 / larguraInchadaEmDispositivo;
  return diagonal ? gradiente * Math.SQRT2 : gradiente;
}

/**
 * A CESSÃO DA LINHA AO NÚCLEO ACESO — decisão do dono, 25/08, com as
 * palavras dele: **a linha de órbita CEDE BRILHO onde cruza o miolo aceso
 * de um corpo**. É a porta (a) das duas que a medição do item 70 deixou
 * abertas, e ela NÃO conflita com a decisão de 23/08 ("as órbitas passam
 * à frente"): aquela era sobre a ORDEM DA FILA — o item 77 vinha
 * primeiro —, nunca sobre desenho. A procedência está no `fe29483`.
 *
 * POR QUE ELA EXISTE, medido: o planeta está SOBRE a própria elipse, e a
 * linha atravessa o limiar de fonte do MB1 (0,40) exatamente onde o
 * núcleo do corpo também está. As duas luzes viram UMA componente, o
 * centroide do bloco anda enquanto a linha entra e sai do limiar, e o
 * juiz cobra esse passeio da âncora do corpo — `zoomDeRoda` passo 8,
 * âncora de Vênus, 1,74 px contra um teto de 1,02. Com `?noorbitas=1` o
 * salto some (0,2 px), o que prova de quem é a luz.
 *
 * A REGRA, e ela é de TELA porque o defeito é de tela: cada linha deita UM
 * disco de cessão — o do corpo DONO daquela órbita — sobre a posição
 * projetada dele; dentro de `RAIO_DA_CESSAO_PX` a linha some, e volta ao
 * cheio em `BORDA_DA_CESSAO_PX`, com `smoothstep` no meio — transição
 * suave, sem degrau que o MB1 leria como fervura.
 *
 * O ESCOPO É O DONO DA LINHA, e isto foi MEDIDO, não preferido. A primeira
 * versão deitava um disco de CADA um dos dez corpos sobre TODAS as linhas,
 * que é a leitura literal da frase do dono. O MB1 reprovou na hora, e com
 * razão: dez discos cortam cada elipse em vários arcos, e arco curto deixa
 * de ser TRAÇO (a exclusão que o juiz dá a uma linha comprida) para virar
 * fonte compacta de brilho marginal — sete acusações de SUMIU em
 * `zoomDeRoda`, todas de pedaço de linha piscando em cima da soleira de
 * identidade (pico 0,57–0,59 contra a soleira 0,565), e o pior resíduo da
 * família subindo de 0,65 para 1,35 degraus. Com UM disco por linha a
 * elipse fechada vira UM arco aberto, que segue sendo traço. E é onde o
 * defeito realmente mora: o que funde com o núcleo é a linha DO PRÓPRIO
 * corpo, porque o corpo está sobre a própria elipse por construção
 * algébrica (§1 — o vértice 0 do laço É a posição viva). Cruzamento de tela
 * entre a linha de um e o núcleo de outro é raro, passageiro, e não foi
 * visto por juiz nenhum; o dia em que for, volta com número.
 *
 * OS DOIS NÚMEROS SÃO MEDIDOS, não escolhidos. A componente de Vênus que o
 * juiz casava tinha `nMeia = 22` px acima da meia altura — raio de núcleo de
 * ~2,6 px. Varrendo o raio contra o MB1 (`zoomDeRoda`): **0,5 px não basta**
 * (a âncora de Vênus segue saltando 1,75 px, teto 1,02) e **2 px basta** (o
 * salto some da corrida inteira). 5 px de borda devolvem a linha antes de ela
 * virar tracejado. Ficou no MÍNIMO que cumpre, e o motivo está logo abaixo.
 *
 * O PREÇO, MEDIDO E DECLARADO — cortar uma curva FECHADA fragmenta-a, e o
 * juiz passa a ver os pedaços. Enquanto a elipse é um laço, ela é UMA
 * componente comprida e o MB1 a exclui por TRAÇO (`nucleoCompacto`); com o
 * corte ela vira arco, e onde o arco entra e sai do quadro sobram pedaços
 * COMPACTOS de brilho marginal (pico 0,58–0,60 contra a soleira de identidade
 * 0,565) que o juiz passa a julgar — e que trocam de identidade quando o
 * corte anda com o planeta. A conta é monotônica no tamanho do corte:
 *
 *     sem cessão   → 1 defeito  (a âncora de Vênus, o que se veio consertar)
 *     raio 0,5 px  → 2 defeitos (Vênus AINDA salta, mais 1 pedaço)
 *     raio 2 px    → 6 defeitos (Vênus consertado, 6 pedaços em `zoomDeRoda`)
 *
 * As seis eram do INSTRUMENTO, não da tela, e foi o instrumento que mudou: a
 * exclusão de traço do MB1 ganhou uma irmã — a faixa de instrumento
 * (`mascaraDasOrbitas`, em `estabilidade-temporal.mjs`) —, pedaço de linha
 * voltou a ser linha, e a corrida inteira fecha em ZERO sem afrouxar soleira
 * nenhuma. A decisão do dono ficou de pé; quem aprendeu foi o juiz.
 *
 * UMA RÉGUA SÓ, e ela é a do `gl_FragCoord`. O `Vector4` que
 * `escreverNucleos` escreve já sai em PIXEL DE BUFFER — centro E raio —, e o
 * fragment compara distância sem multiplicar por nada. A primeira versão
 * misturava dois espaços: dividia o raio pela altura de BUFFER e devolvia o
 * produto contra `resolution`, que o three guarda em px de CSS (§5). Em
 * `pixelRatio` 1 os dois erros se cancelam, e é por isso que o MB1 — que
 * captura a 1× — não viu nada; num Retina (2×) o disco pousava A MEIO
 * CAMINHO entre a origem do quadro e o planeta, com METADE do raio.
 *
 * O TAMANHO APARENTE CONTINUA SENDO O DE CSS, como o da própria fita: os dois
 * números abaixo são px de CSS e `escreverNucleos` os multiplica pelo
 * `pixelRatio` vivo. Mesmo buraco visual em qualquer tela.
 */
export const RAIO_DA_CESSAO_PX = 2;
export const BORDA_DA_CESSAO_PX = 5;

/**
 * O piso e o topo do fade DE BAIXO, em pixels de raio — DE CSS, desde
 * 29/08 (item 97): a régua de tamanho aparente da casa é a de CSS (a
 * fita, a cessão e o clarão já obedecem), e este era o último número da
 * peça medindo em px de buffer. No Retina o mesmo céu dava o dobro de
 * pixels e a linha cruzava os limiares com METADE do tamanho aparente —
 * cada órbita nascia e enchia a exatamente o DOBRO da distância
 * (Mercúrio cheio a 39 UA no dpr 2 contra 19,6 no dpr 1). Em dpr 1 a
 * divisão é por um: bit a bit o desenho de sempre. Abaixo do piso a
 * elipse não é curva, é sujeira sobre o ponto do corpo.
 */
const RAIO_MIN_PX = 3;
const RAIO_CHEIO_PX = 16;

/**
 * O fade DE CIMA, em frações do SEMI-ÂNGULO VERTICAL da lente: em 1,0 o
 * apoastro encosta na borda do quadro, e a partir daí a órbita deixa de
 * caber. Some de vez em 1,8.
 */
const CABE_NO_QUADRO = 1.0;
const FORA_DO_QUADRO = 1.8;

/**
 * A margem do teste "pai enquadrado", em NDC. 1,0 é a borda exata do
 * quadro; a folga de 25% evita que a linha da lua pisque quando o pai
 * encosta na moldura.
 */
const MARGEM_DO_PAI_NDC = 1.25;

/**
 * O BRILHO DA LINHA — o único número de intensidade desta camada, e ele
 * é de instrumento (§5). Aditivo sobre um céu que já foi medido: alto
 * demais e a linha vira a fonte de luz mais forte do quadro dentro do
 * sistema; baixo demais e ela não sobrevive ao bloom.
 */
const BRILHO_DA_LINHA = 0.32;

/**
 * O REALCE DO FOCO (§5b), em multiplicadores do brilho de instrumento.
 * Os dois números foram escolhidos com a FOTO na mão, na vista
 * `foco-luas` do `ab-identidade` — oito linhas repartidas ao meio, as
 * quatro galileanas contra as quatro heliocêntricas de dentro:
 *
 *   - 1,75 leva a linha do assunto de 0,32 a **0,56**. Acima disso ela
 *     começa a alimentar o bloom e vira a fonte mais forte do quadro
 *     dentro do sistema, que é o teto que o §5 já impunha ao 0,32.
 *   - 0,35 leva as demais a **0,112**. Elas têm de CONTINUAR LEGÍVEIS —
 *     recuar não é apagar, e a leitura que o item 77 existe para dar
 *     ("Marte está entre a Terra e Júpiter") morre se o vizinho some.
 *     Abaixo de ~0,08 a linha fina não sobrevive ao céu.
 *
 * A razão entre os dois é 5×, e é ela que o olho lê como hierarquia.
 */
const REALCE_DO_FOCO = 1.75;
const RECUO_FORA_DO_FOCO = 0.35;

/**
 * A VELOCIDADE DA TRANSIÇÃO do realce, em 1/s — o decaimento por quadro
 * é `exp(-k·dt)`, o idioma de `zoomDaRoda`. Com k = 9 a constante de
 * tempo é 0,11 s e a troca de alvo chega a 99% em ~0,5 s: rápido o
 * bastante para não parecer preguiça, lento o bastante para o olho ver
 * QUEM mudou.
 */
const VELOCIDADE_DO_REALCE = 9;

/**
 * Onde o realce ENCOSTA no alvo. Sem encosto o exponencial convergiria
 * para sempre e `animando` nunca ficaria falso — a captura esperaria
 * até o teto e o gate acusaria sinal quebrado.
 *
 * 1e-3 DE MULTIPLICADOR É 3e-4 DE ALFA: um décimo do passo de 8 bits,
 * ou seja invisível por construção. E o número tem um segundo dono: é
 * ele que fixa em ~0,75 s o quanto uma vista de `?foco=` segura o
 * obturador do gate. Apertá-lo para 1e-4 custaria 1 s por captura para
 * comprar um centésimo de passo de 8 bits — que ninguém vê.
 */
const REALCE_ASSENTADO = 1e-3;

/**
 * O cinza frio de quem não tem cor medida na fotometria (§5).
 *
 * HOJE NINGUÉM CAI AQUI, e isso é declarado em vez de apagado: os 30
 * corpos com linha ou estão na `FOTOMETRIA` (os nove) ou têm pai que
 * está (as 21 luas). O fallback é a RESTRIÇÃO que sustenta a promessa
 * escrita no item 77 do `PENDENCIAS.md` — que devolver os oito
 * heliocêntricos sem ponto é UMA linha (`...HELIO_SEM_PONTO.map(…)`
 * em `CORPOS_COM_ORBITA`). Sem ele, aquela "uma linha" seriam três, e
 * a nota do documento viraria mentira no dia em que alguém tentasse.
 * Ceres, Éris e os asteroides não têm linha na fotometria: é este
 * cinza que os vestiria.
 */
const COR_NEUTRA: readonly [number, number, number] = [0.62, 0.70, 0.85];

/** Abaixo disto o alfa não vale um passo de 8 bits — a linha sai da cena. */
const ALFA_INVISIVEL = 1 / 512;

/**
 * O que esta camada precisa da efeméride, e NADA além disto — mesmo
 * padrão de `FonteDeEfemerides` (`planetas.ts`): o `MotorEfemerides`
 * satisfaz esta forma sem saber que ela existe, e assim o módulo do
 * motor (tabela, cache, registro, elementos) não entra no grafo por
 * aqui.
 */
export interface FonteDeOrbitas {
  /** parent-centered, UA, eclíptica J2000 — o laço sai daqui */
  posicao(bodyId: string, jdTdb: number): { x: number; y: number; z: number };
  /** UA/dia, mesmo frame e mesmo instante */
  velocidade(bodyId: string, jdTdb: number): { x: number; y: number; z: number };
  /** heliocêntrica — só para POSICIONAR o laço de uma lua no pai */
  posicaoHeliocentrica(bodyId: string, jdTdb: number): { x: number; y: number; z: number };
}

/** Um corpo que ganha linha: quem é, em volta de quem, com que matiz. */
export interface CorpoComOrbita {
  id: string;
  /** 'sun' para os heliocêntricos; o planeta, para as 21 luas */
  centro: string;
  /** RGB linear já normalizado no canal mais forte (§5) */
  cor: readonly [number, number, number];
}

/**
 * O matiz da linha, normalizado no canal mais forte (§5) — desde 29/08
 * (item 83 · B3, escolha dele na prancha v3) a fonte primeira é a COR
 * DA TEXTURA do próprio globo (`COR_DA_TEXTURA`, com a receita e a
 * procedência lá), e a fotometria é a reserva: Mercúrio — cuja textura
 * é toda neutra e não vota — e qualquer corpo fora da tabela continuam
 * como sempre foram. As luas herdam a cor do PAI, nos dois casos.
 */
/**
 * A COR DA ÓRBITA de um corpo, exportada para quem pinta COM ela fora
 * desta camada — desde 29/08 os ANÉIS dos rótulos (item 89, o
 * comportamento completo do Eyes) vestem a mesma cor da linha: o anel
 * de Netuno é azul porque a órbita de Netuno é azul. Uma lei de cor,
 * duas superfícies.
 */
export function corDaOrbita(id: string): readonly [number, number, number] | null {
  return matizDe(id);
}

function matizDe(id: string): readonly [number, number, number] | null {
  const daTextura = COR_DA_TEXTURA[id];
  if (daTextura) return daTextura;
  const linha = FOTOMETRIA[id];
  if (!linha) return null;
  const c = linha.corLinear;
  const pico = Math.max(c[0], c[1], c[2]);
  if (!(pico > 0)) return null;
  return [c[0] / pico, c[1] / pico, c[2] / pico];
}

/**
 * QUEM GANHA LINHA — derivado das listas do config único, nunca uma
 * lista nova digitada: os NOVE do retrato (o Sol é a origem e não
 * orbita nada) e as 21 LUAS, que trazem o pai dentro.
 *
 * OS OITO HELIOCÊNTRICOS SEM PONTO FICAM DE FORA (`HELIO_SEM_PONTO` —
 * Ceres, Éris, Haumea, Makemake, Quaoar, Vesta, Palas, Hígia), e a
 * decisão foi tomada com a FOTO na mão, não no papel. A regra que ela
 * obedece: **a linha é a LEITURA de um corpo que a cena desenha no
 * mesmo enquadramento.** Os oito não têm ponto fotométrico — o nome da
 * lista diz isso —, então de longe a linha seria um anel em volta de
 * nada; e de perto, onde eles ganham globo, a órbita já não cabe no
 * quadro por duas ordens de grandeza. Não há distância em que a linha
 * deles esteja lendo alguma coisa.
 *
 * O QUE ELA CUSTAVA, medido a 224 UA com a lente de 35° — a vista
 * larga, que era a abertura quando a medida foi feita, virou teto com o
 * item 61 e desde 29/08 é a ABERTURA de novo (o sistema inteiro sob a
 * lente de 58°, ~134 UA) — ou seja, o novelo voltaria a nascer na
 * PRIMEIRA tela se as oito ganhassem linha: as quatro transnetunianas
 * são inclinadas e excêntricas, e as
 * quatro do cinturão são quase o mesmo anel repetido — as oito juntas
 * viravam um novelo cruzando o quadro inteiro, e os PLANETAS, que são o
 * que o item 77 existe para deixar legível ("o visitante não tem como
 * ler que Marte está entre a Terra e Júpiter"), sumiam dentro dele.
 *
 * Voltar atrás é uma linha — `...HELIO_SEM_PONTO.map(…)` aqui — se o
 * dono quiser as oito de volta.
 */
export const CORPOS_COM_ORBITA: readonly CorpoComOrbita[] = [
  ...CORPOS_DO_SISTEMA.filter((c) => c.id !== 'sun').map((c) => ({
    id: c.id,
    centro: 'sun',
    cor: matizDe(c.id) ?? COR_NEUTRA,
  })),
  ...LUAS_DO_SISTEMA.map((l) => ({
    id: l.id,
    centro: l.pai,
    // a lua herda o matiz do pai: é assim que o olho lê "estas quatro
    // são de Júpiter" sem um rótulo em cima de cada uma
    cor: matizDe(l.pai) ?? COR_NEUTRA,
  })),
];

/**
 * A CÔNICA OSCULADORA de um estado, amostrada em anomalia excêntrica
 * (§2), devolvida como GEOMETRIA e não como pontos: o tamanho, a forma,
 * os dois versores do plano e a fase do corpo. `null` quando o estado
 * não define elipse (órbita aberta, μ ausente, movimento radial).
 *
 * SEPARAR A CÔNICA DO LAÇO não é gosto de arquitetura: a ponte de frame
 * é LINEAR, então girar os DOIS versores gira o laço inteiro
 * (`escreverLaco`). Girar vértice a vértice custaria 256 matrizes e 256
 * alocações por corpo e por instante — `eclipticaParaEquatorial` devolve
 * um array novo por chamada — num método que roda a cada quadro em que
 * o relógio anda.
 */
export interface Conica {
  /** semieixo maior, na unidade de `r` (UA) */
  semieixoUa: number;
  excentricidade: number;
  /** versor ao periastro, no frame de `r` */
  periastro: readonly [number, number, number];
  /** versor ortogonal no plano, no sentido do movimento */
  lateral: readonly [number, number, number];
  /** anomalia excêntrica DO CORPO — a fase em que o laço começa */
  anomalia0: number;
}

export function conicaOsculadora(
  r: { x: number; y: number; z: number },
  v: { x: number; y: number; z: number },
  mu: number
): Conica | null {
  const rMod = Math.hypot(r.x, r.y, r.z);
  const v2 = v.x * v.x + v.y * v.y + v.z * v.z;
  if (!(rMod > 0) || !(mu > 0) || !Number.isFinite(v2)) return null;

  const inversoDoSemieixo = 2 / rMod - v2 / mu;
  if (!(inversoDoSemieixo > 0)) return null; // parabólica ou hiperbólica
  const a = 1 / inversoDoSemieixo;

  // h⃗ = r⃗ × v⃗ — o momento angular específico dá o PLANO da órbita
  const hx = r.y * v.z - r.z * v.y;
  const hy = r.z * v.x - r.x * v.z;
  const hz = r.x * v.y - r.y * v.x;
  const hMod = Math.hypot(hx, hy, hz);
  if (!(hMod > 0)) return null; // movimento radial: não há elipse

  // e⃗ = (v⃗ × h⃗)/μ − r̂
  const ex = (v.y * hz - v.z * hy) / mu - r.x / rMod;
  const ey = (v.z * hx - v.x * hz) / mu - r.y / rMod;
  const ez = (v.x * hy - v.y * hx) / mu - r.z / rMod;
  let e = Math.hypot(ex, ey, ez);
  if (e >= 1) return null;

  // P̂ aponta ao periastro. Numa órbita quase circular a direção de e⃗ é
  // ruído puro — e a elipse é a mesma qualquer que seja o P̂ escolhido,
  // então o próprio r̂ serve, e serve melhor: com ele E₀ sai 0 exato.
  let px: number, py: number, pz: number;
  if (e > 1e-9) {
    px = ex / e;
    py = ey / e;
    pz = ez / e;
  } else {
    e = 0;
    px = r.x / rMod;
    py = r.y / rMod;
    pz = r.z / rMod;
  }
  // Q̂ = ĥ × P̂ — o eixo menor, no sentido do movimento
  const qx = (hy * pz - hz * py) / hMod;
  const qy = (hz * px - hx * pz) / hMod;
  const qz = (hx * py - hy * px) / hMod;

  const b = a * Math.sqrt(1 - e * e);

  // E₀ do PRÓPRIO estado, para o vértice 0 cair sobre o corpo
  const cos0 = Math.min(1, Math.max(-1, (r.x * px + r.y * py + r.z * pz) / a + e));
  const sen0 = b > 0 ? (r.x * qx + r.y * qy + r.z * qz) / b : 0;
  const e0 = Math.atan2(sen0, cos0);

  return {
    semieixoUa: a,
    excentricidade: e,
    periastro: [px, py, pz],
    lateral: [qx, qy, qz],
    anomalia0: e0,
  };
}

/**
 * O LAÇO, escrito num destino qualquer: `n` vértices varridos em
 * anomalia excêntrica a partir da fase do corpo, na base que o chamador
 * entregar. Os dois versores vêm SEPARADOS da cônica de propósito — é
 * por aí que a camada entrega a base já rodada para o frame da cena (e
 * o teste entrega a base crua, para julgar a álgebra em UA no frame
 * eclíptico, sem a ponte no meio).
 *
 * O VÉRTICE 0 É `r`, exatamente: `anomalia0` é a anomalia do próprio
 * estado lido, e é essa identidade que faz linha e ponto não
 * divergirem. "Exatamente" tem número — 1e-12 relativo num destino de
 * float64, medido em `orbitas.test.ts` (o pior caso é Deimos, que quase
 * não tem excentricidade para dividir); num destino de float32, que é o
 * que a GPU lê, o que sobra é a quantização do buffer, ~1e-7.
 */
export function escreverLaco(
  c: Conica,
  periastro: readonly [number, number, number],
  lateral: readonly [number, number, number],
  escala: number,
  saida: Float32Array | Float64Array,
  n: number
): void {
  const a = c.semieixoUa * escala;
  const b = a * Math.sqrt(1 - c.excentricidade * c.excentricidade);
  const passo = (2 * Math.PI) / n;
  for (let k = 0; k < n; k++) {
    const anomalia = c.anomalia0 + k * passo;
    const ca = a * (Math.cos(anomalia) - c.excentricidade);
    const sa = b * Math.sin(anomalia);
    saida[k * 3] = ca * periastro[0] + sa * lateral[0];
    saida[k * 3 + 1] = ca * periastro[1] + sa * lateral[1];
    saida[k * 3 + 2] = ca * periastro[2] + sa * lateral[2];
  }
}

/**
 * O PASSO DO BUFFER DA FITA, em floats por segmento (§5e): início xyz,
 * fim xyz, vizinho ANTERIOR xyz, vizinho SEGUINTE xyz.
 *
 * OS QUATRO MORAM NO MESMO `InstancedInterleavedBuffer`, e isso não é
 * arrumação: dois buffers exigiriam dois `needsUpdate` e abririam o
 * caminho para a fita ser desenhada com posições novas e vizinhos
 * velhos — um quadro de junta torta a cada salto de data. Num buffer só,
 * a disciplina do §5 continua valendo inteira (muta-se o array, marca-se
 * ELE) e nada realoca no quadro.
 */
export const PASSO_DA_FITA = 12;
const DESLOCAMENTO_DO_FIM = 3;
const DESLOCAMENTO_DO_ANTERIOR = 6;
const DESLOCAMENTO_DO_SEGUINTE = 9;

/**
 * O LAÇO DE PONTOS VIRA FITA DE SEGMENTOS (§5, item 83 · L2; §5e para os
 * vizinhos).
 *
 * O `LineSegmentsGeometry` guarda DOIS pontos por segmento num único
 * buffer interleaved, e cada ponto interior aparece DUAS vezes — como
 * fim do segmento anterior e como início do seguinte. Esta função faz
 * essa expansão, e o segmento `n-1` FECHA o laço ligando o último ponto
 * ao primeiro (é o que o `LineLoop` fazia sozinho e o `LineSegments2`
 * não faz).
 *
 * DESDE O B2 ELA ESCREVE MAIS DOIS: o ponto ANTES do início e o ponto
 * DEPOIS do fim, que são o que o vertex precisa para dobrar a junta na
 * bissetriz (§5e). O mesmo ponto aparece portanto QUATRO vezes na fita —
 * início de `k`, fim de `k−1`, anterior de `k+1` e seguinte de `k−2` —, e
 * as quatro cópias saem da MESMA leitura, num passo só. Sem isso, a
 * bissetriz de uma ponta discordaria da da outra e a fita abriria fenda
 * onde deveria dobrar.
 *
 * O LAÇO É FECHADO, e é por isso que os quatro índices são módulo `n`
 * sem um único caso especial: numa elipse não existe "a primeira" nem "a
 * última" junta. Uma polilinha ABERTA precisaria repetir as pontas, e
 * esta camada não desenha nenhuma.
 *
 * POR QUE NÃO ESCREVER A CÔNICA DIRETO NO PASSO 6: `escreverLaco` é a
 * álgebra provada do item 77, cobrada vértice a vértice contra a
 * efeméride viva. Trocar o layout dela seria mexer no que está certo
 * para atender ao que é desenho; aqui a álgebra continua intacta e a
 * expansão é uma cópia, sem uma conta nova. O custo é uma passada de
 * 256 cópias de 6 floats, contra os 256 senos que a antecedem.
 */
export function espelharNaFita(
  pontos: Float32Array | Float64Array,
  saida: Float32Array | Float64Array,
  n: number
): void {
  for (let k = 0; k < n; k++) {
    const x = pontos[k * 3];
    const y = pontos[k * 3 + 1];
    const z = pontos[k * 3 + 2];
    // CADA PONTO APARECE QUATRO VEZES na fita, e as quatro saem da MESMA
    // cópia dele: é isso que faz a junta ser exata em vez de quase.
    // início do segmento k
    const inicio = k * PASSO_DA_FITA;
    saida[inicio] = x;
    saida[inicio + 1] = y;
    saida[inicio + 2] = z;
    // ...fim do segmento anterior, que para k = 0 é o do FECHAMENTO
    const fim = ((k + n - 1) % n) * PASSO_DA_FITA + DESLOCAMENTO_DO_FIM;
    saida[fim] = x;
    saida[fim + 1] = y;
    saida[fim + 2] = z;
    // ...vizinho ANTERIOR do segmento seguinte (§5e)
    const antes = ((k + 1) % n) * PASSO_DA_FITA + DESLOCAMENTO_DO_ANTERIOR;
    saida[antes] = x;
    saida[antes + 1] = y;
    saida[antes + 2] = z;
    // ...e vizinho SEGUINTE do segmento dois atrás
    const depois = ((k + n - 2) % n) * PASSO_DA_FITA + DESLOCAMENTO_DO_SEGUINTE;
    saida[depois] = x;
    saida[depois + 1] = y;
    saida[depois + 2] = z;
  }
}

/**
 * O LIMITE DA BISSETRIZ (§5e, item 83 · A4) — o `max(0.25, …)` da
 * fórmula, escrito uma vez.
 *
 * Numa dobra muito fechada o canto da bissetriz dispara para o infinito
 * (`1/cos(θ/2)` com θ → 180°), e uma agulha de centenas de pixels
 * atravessando o quadro é pior que a fenda que se veio consertar. 0,25
 * corta o esporão em 4× a largura da fita — o mesmo teto do SVG e do
 * Canvas, e o mesmo da referência.
 *
 * NUMA ELIPSE DE 256 PONTOS ELE NUNCA ENTRA: a dobra por junta é 1,4°, e
 * a escala fica em 1,00008. Ele existe para o dia em que a amostragem
 * mudar, e para as excentricidades altas, onde o periastro concentra
 * vértice e a dobra local cresce.
 */
export const LIMITE_DA_BISSETRIZ = 0.25;

/**
 * QUANTO A BISSETRIZ ESTICA o offset de meia largura numa junta, dado o
 * cosseno do ângulo entre as duas direções (`dot(l0, l1)`, as duas
 * unitárias, na tela).
 *
 * A CONTA É A DA REFERÊNCIA, e é pública (SVG, Canvas, Cesium): o canto
 * externo de uma junta em bissetriz fica a `meiaLargura / cos(θ/2)` do
 * vértice, e `cos(θ/2) = sqrt((1 + cos θ)/2)` pela identidade do arco
 * metade — que é exatamente o `sqrt((1 + dot(l0,l1))/2)` do A4. Sem esse
 * esticão a fita AFINA na dobra, que é o defeito espelhado da fenda.
 *
 * ELA É PURA E EXPORTADA porque é a única metade desta obra que uma
 * máquina sem GPU consegue julgar por NÚMERO: o GLSL carrega a mesma
 * expressão, e o teste cobra as duas pontas — o número aqui e o texto
 * lá.
 */
export function escalaDaBissetriz(cosseno: number): number {
  const meio = Math.sqrt(Math.max(0, (1 + cosseno) / 2));
  return 1 / Math.max(LIMITE_DA_BISSETRIZ, meio);
}

/**
 * O MULTIPLICADOR DO FOCO de um corpo (§5b) — a lei da família, isolada
 * do quadro de propósito.
 *
 * ELA É PURA E É EXPORTADA porque a família tem de ser cobrável sobre os
 * TRINTA corpos, e não só sobre os poucos que estão acesos na vista de
 * teste. Enquanto esta regra viveu dentro do laço do quadro, uma
 * sabotagem que metesse as luas de Saturno na família de Júpiter passava
 * a suíte inteira: as linhas de Saturno não estavam acesas naquele
 * enquadramento, e o que não acende não é medido.
 *
 * A FAMÍLIA É DERIVADA, NUNCA DIGITADA: o alvo (`id === foco`) e as luas
 * dele (`centro === foco`). Não há lista de ids aqui, e é isso que faz a
 * regra continuar certa no dia em que uma lua mudar de pai no config.
 *
 * O SOL CAI NA MESMA REGRA, e é desenho e não acidente: enquadrar o Sol
 * acende as NOVE heliocêntricas (o `centro` delas é ele) e recolhe as 21
 * luas — "mostre-me o sistema". Não há ramo especial para ele, e é isso
 * que se quer: a família do Sol são os planetas pelo MESMO motivo que a
 * de Júpiter são as galileanas.
 */
export function realceDoFoco(
  corpo: CorpoComOrbita,
  foco: string | null
): number {
  if (foco === null) return 1;
  const daFamilia = corpo.id === foco || corpo.centro === foco;
  return daFamilia ? REALCE_DO_FOCO : RECUO_FORA_DO_FOCO;
}

/** Uma linha viva: o objeto do three mais o que o quadro precisa dela. */
interface LinhaDeOrbita {
  readonly corpo: CorpoComOrbita;
  readonly fita: LineSegments2;
  readonly material: LineMaterial;
  /**
   * O buffer interleaved dos segmentos — guardado porque é ELE que leva
   * o `needsUpdate`, e não o atributo. Ver `reamostrar`.
   */
  readonly segmentos: THREE.InstancedInterleavedBuffer;
  /** μ do par centro+corpo, ou `null` se o kernel não tem o centro */
  readonly mu: number | null;
  /** o instante da cônica desenhada; NaN enquanto ela não existe */
  jd: number;
  /** semieixo maior em pc — a régua da ponta de BAIXO do fade */
  semieixoPc: number;
  /** apoastro em pc — a régua da ponta de CIMA, e do recorte de frustum */
  apoastroPc: number;
  /** o alfa do quadro anterior, que é quem decide o reamostrar */
  alfa: number;
  /** o multiplicador do foco (§5b), perseguindo o alvo — nasce neutro */
  realce: number;
  /**
   * O DISCO DE CESSÃO desta linha — `(centroX, centroY, raio, borda)`, os
   * quatro em PIXEL DE BUFFER, que é o espaço do `gl_FragCoord`. É UM por
   * linha, e o corpo do disco é o DONO da órbita (ver
   * `RAIO_DA_CESSAO_PX`). `borda = 0` é disco apagado: corpo atrás da
   * câmera, corpo sem ponto no palco, ou camada dos corpos desligada.
   */
  readonly nucleo: { value: THREE.Vector4 };
}

/**
 * O QUADRO EM PIXEL, as três medidas juntas porque separá-las foi o erro:
 * a cessão nasceu lendo a ALTURA de buffer e devolvendo contra a largura de
 * CSS, e em 1× ninguém viu. Aqui as três andam num nome só, e o nome diz o
 * espaço: `larguraPx` e `alturaPx` são px de BUFFER (`renderer.domElement`,
 * o mesmo tamanho dos alvos do composer e do `gl_FragCoord`), e
 * `pixelRatio` é o que converte px de CSS em px de buffer.
 */
export interface QuadroEmPx {
  larguraPx: number;
  alturaPx: number;
  pixelRatio: number;
}

export class Orbitas {
  readonly group = new THREE.Group();

  /**
   * A porta do quadro, escrita pelo director antes do `update` — a
   * mesma disciplina de `Planetas.ligado`. A camada governa a si mesma
   * e a mais nada.
   */
  ligado = false;

  /**
   * O CORPO EM FOCO (§5b), escrito pelo director antes do `update` pela
   * mesma disciplina de `ligado`. É o `focoCorpoId` da Escada, que é a
   * única escritora do foco na casa — esta camada só LÊ, e não guarda
   * uma segunda ideia de quem está em quadro. `null` na abertura, no
   * filme e quando o foco é uma estrela.
   */
  foco: string | null = null;

  private readonly linhas: LinhaDeOrbita[] = [];
  /** o instante em que os CENTROS foram postos no lugar */
  private jdDosCentros = Number.NaN;
  /** rascunhos reusados — nada aloca no caminho do quadro */
  private readonly pontoEq: [number, number, number] = [0, 0, 0];
  /**
   * O laço em pontos, antes de virar fita (§5) — UM por camada, não um
   * por linha: `reamostrar` o preenche e o consome no mesmo passo, e
   * nada dele sobrevive à chamada.
   */
  private readonly rascunhoDoLaco = new Float32Array(PONTOS_POR_ORBITA * 3);
  private readonly rascunhoNdc = new THREE.Vector3();
  private readonly centroDoPai = new THREE.Vector3();
  /**
   * A FRAÇÃO DA LARGURA QUE É MIOLO (§5d) — onde a saia do AA começa,
   * em `|vUv.x|`. É UM objeto para as TRINTA linhas de propósito: o
   * número depende só da janela, e todos os shaders guardam a referência
   * deste mesmo `{ value }` — escrever nele uma vez por quadro atualiza
   * as trinta, e não existe caminho em que uma linha fique com um miolo
   * de outra janela.
   */
  private readonly miolo = {
    value: LARGURA_DA_FITA_PX / (LARGURA_DA_FITA_PX + SAIA_DO_AA_PX),
  };

  constructor(corpos: readonly CorpoComOrbita[] = CORPOS_COM_ORBITA) {
    this.group.name = 'orbitas';
    // O GRADIENTE É UM BUFFER SÓ PARA AS TRINTA LINHAS (item 115, bloco
    // B, peça 3). Ele é função do ÍNDICE do vértice, e o índice 0 é
    // sempre o corpo — logo o mesmo array serve todos os laços e sobe
    // para a GPU uma vez. Nada aqui é reescrito por quadro: o que anda é
    // o laço, e o ponto claro anda com ele de graça.
    const gradiente = new THREE.InstancedInterleavedBuffer(
      corDoGradienteDaFita(PONTOS_POR_ORBITA),
      6,
      1
    );
    for (const corpo of corpos) {
      const geo = new LineSegmentsGeometry();
      // O BUFFER NASCE AQUI E NÃO MORRE MAIS (§5): `setPositions()` aloca
      // um `InstancedInterleavedBuffer` novo e recomputa as duas
      // bounding volumes a cada chamada, e esta camada reescreve o laço
      // a cada salto de data. O buffer é montado UMA vez, à mão, e o
      // caminho do quadro só muta o array dele.
      const segmentos = new THREE.InstancedInterleavedBuffer(
        new Float32Array(PONTOS_POR_ORBITA * PASSO_DA_FITA),
        PASSO_DA_FITA,
        1
      );
      geo.setAttribute('instanceStart', new THREE.InterleavedBufferAttribute(segmentos, 3, 0));
      geo.setAttribute(
        'instanceEnd',
        new THREE.InterleavedBufferAttribute(segmentos, 3, DESLOCAMENTO_DO_FIM)
      );
      // OS DOIS VIZINHOS (§5e) — a junta em bissetriz lê daqui. Os nomes
      // são novos no shader: o `LineMaterial` não os conhece, e é a
      // cirurgia do vertex que os declara.
      geo.setAttribute(
        'instanceAnterior',
        new THREE.InterleavedBufferAttribute(segmentos, 3, DESLOCAMENTO_DO_ANTERIOR)
      );
      geo.setAttribute(
        'instanceSeguinte',
        new THREE.InterleavedBufferAttribute(segmentos, 3, DESLOCAMENTO_DO_SEGUINTE)
      );
      // O GRADIENTE (peça 3), nos nomes que o `LineMaterial` já conhece —
      // `vertexColors` acende o `USE_COLOR` dele e o `<color_fragment>`
      // multiplica a cor da linha por este fator. Não é `setColors()`
      // porque ela ALOCA um buffer novo por chamada, e aqui as trinta
      // linhas compartilham o mesmo.
      geo.setAttribute(
        'instanceColorStart',
        new THREE.InterleavedBufferAttribute(gradiente, 3, 0)
      );
      geo.setAttribute(
        'instanceColorEnd',
        new THREE.InterleavedBufferAttribute(gradiente, 3, 3)
      );
      geo.instanceCount = PONTOS_POR_ORBITA;
      // nasce com raio zero: sem cônica escrita não há nada para cortar
      geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0);
      const material = new LineMaterial({
        color: new THREE.Color(corpo.cor[0], corpo.cor[1], corpo.cor[2]),
        // A LARGURA INCHADA (§5d): o traço visível MAIS a saia do AA. O
        // `update` reescreve os dois números a cada quadro pelo fator da
        // janela; este é o valor de fábrica, o da janela de referência.
        linewidth: LARGURA_DA_FITA_PX + SAIA_DO_AA_PX,
        transparent: true,
        opacity: 0,
        // O GRADIENTE DA FITA (peça 3): acende o `USE_COLOR`, e com ele
        // o `<color_fragment>` do three multiplica `diffuseColor.rgb`
        // pelo fator por vértice. Em blending ADITIVO multiplicar a cor
        // é multiplicar a contribuição — o mesmo produto que um alfa por
        // vértice daria, e o `LineMaterial` não tem alfa por vértice
        // (o alfa dele é uniform, issue #23680).
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        // linha atrás de globo resolvido SOME — é o palco quem escreve
        // profundidade, e é o comportamento certo (§5)
        depthTest: true,
        // sem MSAA nesta casa não há cobertura para escrever (§5)
        alphaToCoverage: false,
        // A JUNTA SEM CONTA (§5c) — o trio que descarta a calota. NÃO
        // traceja nada: `gapSize` zero deixa o resto de `mod` sempre
        // dentro do traço.
        dashed: true,
        dashSize: 1,
        gapSize: 0,
      });
      const nucleo = { value: new THREE.Vector4(0, 0, 0, 0) };
      this.cederAoNucleo(material, nucleo);
      const fita = new LineSegments2(geo, material);
      // O ATRIBUTO QUE O `USE_DASH` EXIGE (§5c), UMA VEZ E SÓ AQUI: o
      // vertex lê `instanceDistanceStart/End`, e sem eles o material
      // quebra. As posições ainda são zero neste ponto — e servem, porque
      // com `gapSize` zero a distância nunca decide nada.
      fita.computeLineDistances();
      // slots ocupados: … 6 (marcador), 7 (pontos dos planetas)
      fita.renderOrder = 8;
      fita.visible = false;
      this.group.add(fita);
      this.linhas.push({
        corpo,
        fita,
        material,
        segmentos,
        mu: muDoPar(corpo.centro, corpo.id),
        jd: Number.NaN,
        semieixoPc: 0,
        apoastroPc: 0,
        alfa: 0,
        realce: 1,
        nucleo,
      });
    }
  }

  /**
   * A CIRURGIA DO FRAGMENTO do `LineMaterial` (three/addons), e ela leva
   * DUAS costuras num callback só — a saia do AA (§5d) e a cessão ao
   * núcleo. Não é economia: `onBeforeCompile` é um CAMPO, e um segundo
   * callback APAGARIA o primeiro em silêncio, sem erro de compilação e
   * sem teste vermelho. O nome fica no que a casa já chama assim.
   *
   * A ORDEM DENTRO DO FRAGMENTO É LEI, e é esta: (1) o `discard` da
   * calota, que o `USE_DASH` já traz de fábrica (§5c); (2) a SAIA, que
   * decide quanto daquele pixel é fita; (3) a CESSÃO, que decide se
   * aquela fita cede lugar ao núcleo aceso; (4) o `gl_FragColor`. Inverter
   * (2) e (3) daria o mesmo produto — as duas são multiplicações — mas
   * quem lê o shader tem de achar a largura resolvida ANTES do disco,
   * porque é assim que os dois efeitos se explicam.
   *
   * A CESSÃO — ver o cabeçalho de `RAIO_DA_CESSAO_PX` para a decisão do
   * dono e os números. É de texto, no molde de `domarPassaAlta`
   * (`core/post.ts`): o `alpha` do fragment é multiplicado pelo
   * `smoothstep` da distância ao disco do corpo DONO da linha, ANTES de
   * virar `gl_FragColor`.
   *
   * A SAIA — `u = |vUv.x|` é a distância ao eixo da fita em frações da
   * MEIA largura inchada, e o `LineMaterial` já a interpola no caminho de
   * pixels. `fwidth(u)` é o tamanho de um pixel nessa mesma régua, e
   * atrasar a rampa dele deixa a beira acabar em rampa mesmo quando a
   * fita corre quase paralela à grade. O nome no shader é `uMiolo` e
   * NUNCA `nucleo`: `uNucleo` já é o disco da cessão, e trocar os dois
   * seria trocar a largura pelo buraco.
   *
   * O SHADER NÃO CONVERTE NADA, e essa é a defesa: `uNucleo` chega pronto
   * no espaço do `gl_FragCoord` — `xy` é o centro em px de buffer, `z` e
   * `w` são o raio e a borda nos MESMOS px. Nenhuma multiplicação por
   * `resolution` aqui dentro; `resolution` é px de CSS (§5) e foi
   * exatamente misturá-la com `gl_FragCoord` que fez o disco pousar no
   * lugar errado em Retina. Uma régua só, e ela mora na CPU.
   *
   * Sem laço: é um `vec4` e um `if`. Corpo sem disco neste quadro chega com
   * `w = 0` e o `if` inteiro fica de fora.
   */
  private cederAoNucleo(material: LineMaterial, nucleo: { value: THREE.Vector4 }) {
    material.onBeforeCompile = (shader) => {
      this.dobrarNaBissetriz(shader);
      shader.uniforms.uNucleo = nucleo as unknown as THREE.IUniform;
      shader.uniforms.uMiolo = this.miolo as unknown as THREE.IUniform;
      const ALVO = 'gl_FragColor = vec4( diffuseColor.rgb, alpha );';
      if (!shader.fragmentShader.includes(ALVO)) {
        throw new Error('cederAoNucleo: o fragment do LineMaterial mudou de forma');
      }
      shader.fragmentShader = shader.fragmentShader
        .replace(
          'void main() {',
          'uniform vec4 uNucleo;\nuniform float uMiolo;\nvoid main() {'
        )
        .replace(
          ALVO,
          // (2) A SAIA (§5d). O `max(…, 0.0)` é o GRAMPO do eixo: sem
          // ele, numa fita fina de dispositivo o `fwidth` passa do
          // miolo, o começo da rampa fica NEGATIVO e o centro da fita
          // perde brilho — o perfil através da largura que o item 83
          // proíbe. Ver `perfilDaSaia`, que é esta conta em TypeScript.
          'float u = abs(vUv.x);\n'
            + '\tfloat pixel = fwidth(u);\n'
            + '\talpha *= 1.0 - smoothstep(max(uMiolo - pixel, 0.0), 1.0, u);\n'
            // (3) A CESSÃO ao núcleo aceso
            + '\tif (uNucleo.w > 0.0) {\n'
            + '\t\talpha *= smoothstep(uNucleo.z, uNucleo.w,\n'
            + '\t\t                    length(gl_FragCoord.xy - uNucleo.xy));\n'
            + `\t}\n\t${ALVO}`
        );
    };
  }

  /**
   * A LARGURA DA FITA NESTE QUADRO (§5d) — os DOIS números, escritos da
   * MESMA chamada de `larguraVisivelDaFitaPx`, que é o que impede o
   * shader de suavizar uma beira que a geometria pôs noutro lugar.
   *
   * O `linewidth` do material é a largura INCHADA (visível + saia); o
   * `uMiolo` é onde a rampa começaria — a fração chapada quando há
   * largura de dispositivo para um platô (§5d). Uma linha só entre os
   * dois: não há caminho em que um seja recalculado e o outro não.
   *
   * ELA RODA ANTES DO GATE DE FASE, com a camada apagada inclusive. É
   * uma divisão e um `max` — e o quadro em que a gaveta abre já encontra
   * a fita na grossura da janela, em vez de um quadro na grossura da
   * anterior.
   *
   * NÃO SE ESCREVE `resolution` AQUI, e é a mesma lei do §5: quem o
   * escreve é o `LineSegments2.onBeforeRender`, em px de CSS. `linewidth`
   * é um uniform de largura, não de janela — mexer nele não reintroduz o
   * bug que o upstream fechou.
   */
  private escreverLargura(quadro: QuadroEmPx) {
    const visivel = larguraVisivelDaFitaPx(quadro);
    this.miolo.value = visivel / (visivel + SAIA_DO_AA_PX);
    const inchada = visivel + SAIA_DO_AA_PX;
    for (const linha of this.linhas) linha.material.linewidth = inchada;
  }

  /**
   * A JUNTA VIRA BISSETRIZ (§5e, item 83 · B2 / A4) — a cirurgia do
   * VERTEX, irmã da do fragmento e instalada pelo MESMO callback.
   *
   * O `LineMaterial` empurra cada ponta do quad na PERPENDICULAR DAQUELE
   * segmento. Numa curva os dois quads que se encontram numa junta
   * empurram em direções diferentes: por fora abre CUNHA, por dentro
   * dobra tinta. A cura é a de livro, e é a mesma da referência: empurrar
   * na BISSETRIZ das duas perpendiculares, esticada por `1/cos(θ/2)`
   * para o canto externo encostar exatamente na quina.
   *
   * TUDO EM ESPAÇO DE TELA, como o resto do shader: os vizinhos são
   * projetados pelo MESMO caminho de `instanceStart`/`instanceEnd` e as
   * direções saem em NDC já corrigido pela proporção do quadro — é o
   * único espaço em que "meia largura de pixel" quer dizer alguma coisa.
   *
   * O QUE SOBREVIVE INTEIRO, e cada um por uma razão escrita:
   *   - o `discard` do `USE_DASH` (§5c) — é do FRAGMENTO, e esta cirurgia
   *     não encosta nele. A calota continua morta e o colar não volta.
   *   - o CORTE NO NEAR PLANE — o `trimSegmentAlpha` do three roda ANTES
   *     desta conta, sobre `start`/`end`, e continua mandando. A
   *     bissetriz apenas DESISTE quando o segmento ou um vizinho está
   *     atrás do olho (`atras`, abaixo): ali ela não tem direção que
   *     signifique alguma coisa, e a perpendicular de sempre é a resposta
   *     certa.
   *   - o `resolution` AUTOMÁTICO — a conta lê `aspect`, que o próprio
   *     shader deriva dele; ninguém o escreve aqui (§5).
   *   - o `raycast` de que o L5 vai depender — ele lê `instanceStart` e
   *     `instanceEnd` por `fromBufferAttribute`, que é cego ao passo do
   *     buffer. Os vizinhos são atributos NOVOS; nada do que ele lê mudou
   *     de nome ou de lugar.
   *
   * A DEGENERESCÊNCIA TEM RAMO PRÓPRIO e não é paranoia: com dois pontos
   * coincidentes a direção é `normalize(0)` = NaN, e um NaN em
   * `gl_Position` some com o segmento inteiro sem erro nenhum. Direção
   * curta demais ou bissetriz curta demais (a volta de 180°, em que as
   * duas perpendiculares se cancelam) caem na perpendicular de sempre.
   */
  private dobrarNaBissetriz(shader: { vertexShader: string }) {
    const ATRIBUTOS = 'attribute vec3 instanceStart;';
    const DIRECAO = '// direction\n\t\t\tvec2 dir = ndcEnd.xy - ndcStart.xy;';
    const PERPENDICULAR = 'vec2 offset = vec2( dir.y, - dir.x );';
    for (const alvo of [ATRIBUTOS, DIRECAO, PERPENDICULAR]) {
      if (!shader.vertexShader.includes(alvo)) {
        throw new Error('dobrarNaBissetriz: o vertex do LineMaterial mudou de forma');
      }
    }
    shader.vertexShader = shader.vertexShader
      .replace(
        ATRIBUTOS,
        `${ATRIBUTOS}\n\t\tattribute vec3 instanceAnterior;\n\t\tattribute vec3 instanceSeguinte;`
      )
      .replace(
        DIRECAO,
        // os dois vizinhos pelo MESMO caminho do início e do fim
        'vec4 anterior = modelViewMatrix * vec4( instanceAnterior, 1.0 );\n'
          + '\t\t\tvec4 seguinte = modelViewMatrix * vec4( instanceSeguinte, 1.0 );\n'
          + '\t\t\tvec4 clipAnterior = projectionMatrix * anterior;\n'
          + '\t\t\tvec4 clipSeguinte = projectionMatrix * seguinte;\n'
          // ATRÁS DO OLHO a projeção espelha, e a bissetriz desiste
          + '\t\t\tbool atras = start.z >= 0.0 || end.z >= 0.0\n'
          + '\t\t\t\t|| anterior.z >= 0.0 || seguinte.z >= 0.0;\n'
          + `\t\t\t${DIRECAO}`
      )
      .replace(
        PERPENDICULAR,
        `${PERPENDICULAR}\n`
          + '\t\t\t\tif ( ! atras ) {\n'
          + '\t\t\t\t\tvec2 dAnterior = ndcStart.xy - clipAnterior.xy / clipAnterior.w;\n'
          + '\t\t\t\t\tvec2 dSeguinte = clipSeguinte.xy / clipSeguinte.w - ndcEnd.xy;\n'
          + '\t\t\t\t\tdAnterior.x *= aspect;\n'
          + '\t\t\t\t\tdSeguinte.x *= aspect;\n'
          // direção NULA (pontos coincidentes) devolveria NaN
          + '\t\t\t\t\tif ( length( dAnterior ) > 1e-9 && length( dSeguinte ) > 1e-9 ) {\n'
          + '\t\t\t\t\t\tvec2 l0 = ( position.y < 0.5 ) ? normalize( dAnterior ) : dir;\n'
          + '\t\t\t\t\t\tvec2 l1 = ( position.y < 0.5 ) ? dir : normalize( dSeguinte );\n'
          + '\t\t\t\t\t\tvec2 bissetriz = vec2( l0.y, - l0.x ) + vec2( l1.y, - l1.x );\n'
          // a volta de 180° cancela as duas perpendiculares
          + '\t\t\t\t\t\tif ( length( bissetriz ) > 1e-6 ) {\n'
          + '\t\t\t\t\t\t\toffset = normalize( bissetriz )\n'
          + `\t\t\t\t\t\t\t\t/ max( ${LIMITE_DA_BISSETRIZ.toFixed(2)},`
          + ' sqrt( ( 1.0 + dot( l0, l1 ) ) / 2.0 ) );\n'
          + '\t\t\t\t\t\t}\n'
          + '\t\t\t\t\t}\n'
          + '\t\t\t\t}'
      );
  }

  /**
   * ONDE ESTÁ O NÚCLEO DE CADA DONO neste quadro. Recebe o Float32Array
   * VIVO de `Planetas.posicoes` (a ordem é a de `IDS_FOTOMETRIA`) e projeta
   * o corpo DONO de cada linha. Corpo ATRÁS da câmera sai apagado —
   * `project` devolveria a posição espelhada, e um disco de cessão fantasma
   * comeria a linha do lado errado do céu. A Lua fica FORA deste laço, que
   * indexa `IDS_FOTOMETRIA` — os dez do retrato; ela tem ponto desde o item
   * 108 (o 11º vértice), mas continua sem ceder a ninguém, e continua certo:
   * o defeito é o corpo sobre a PRÓPRIA elipse, e a elipse da Lua só aparece
   * na escala do sistema Terra–Lua, onde o globo já domina e a cessão do
   * ponto foi a 1 exato (medido no A/B do 108, vistas `terra`, `lua`,
   * `terralua` e os três eclipses). Não há ponto a proteger ali.
   *
   * TUDO SAI EM PIXEL DE BUFFER, que é o espaço do `gl_FragCoord` e o único
   * que o shader conhece: a largura e a altura são as do canvas
   * (`renderer.domElement`), e o raio de CSS vira buffer multiplicando pelo
   * `pixelRatio` — é o que mantém o buraco do MESMO tamanho aparente em 1×
   * e em 2×. Aritmética pura de CPU, de propósito: é o que deixa a conta
   * ser aferida sem navegador, por `nucleoDe`.
   */
  private escreverNucleos(
    camera: THREE.PerspectiveCamera,
    quadro: QuadroEmPx,
    posicoes: Float32Array | null
  ) {
    const raio = RAIO_DA_CESSAO_PX * quadro.pixelRatio;
    const borda = BORDA_DA_CESSAO_PX * quadro.pixelRatio;
    const podeCeder = quadro.larguraPx > 0 && quadro.alturaPx > 0 && borda > raio;
    for (const linha of this.linhas) {
      const alvo = linha.nucleo.value;
      const i = IDS_FOTOMETRIA.indexOf(linha.corpo.id as (typeof IDS_FOTOMETRIA)[number]);
      const j = i * 3;
      if (!posicoes || i < 0 || j + 2 >= posicoes.length || !podeCeder) {
        alvo.set(0, 0, 0, 0);
        continue;
      }
      this.rascunhoNdc.set(posicoes[j], posicoes[j + 1], posicoes[j + 2]);
      this.rascunhoNdc.project(camera);
      if (this.rascunhoNdc.z > 1) {
        alvo.set(0, 0, 0, 0);
        continue;
      }
      alvo.set(
        (this.rascunhoNdc.x * 0.5 + 0.5) * quadro.larguraPx,
        (this.rascunhoNdc.y * 0.5 + 0.5) * quadro.alturaPx,
        raio,
        borda
      );
    }
  }

  /**
   * O DISCO DE CESSÃO da linha de um corpo, em px de buffer — leitura de
   * régua/teste, irmã de `acesas`. É o MESMO objeto que o shader lê: quem
   * afere isto afere o que a GPU recebe, e não uma cópia que possa
   * concordar com um shader que já não existe.
   */
  nucleoDe(corpoId: string): THREE.Vector4 | null {
    return this.linhas.find((l) => l.corpo.id === corpoId)?.nucleo.value ?? null;
  }

  /** quantas linhas estão acesas neste quadro — leitura de régua/teste */
  get acesas(): number {
    return this.linhas.reduce((n, l) => n + (l.fita.visible ? 1 : 0), 0);
  }

  /**
   * O CAMINHO VIVO — irmão de `Planetas.escreverInstante`, e pela mesma
   * razão: isto não é o quadro, é o que acontece quando o INSTANTE
   * muda. Reamostra a cônica de quem está aceso e está velho, e repõe
   * os centros das luas na posição do pai naquele instante.
   *
   * QUEM NUNCA FOI AMOSTRADO é amostrado sempre, aceso ou não: sem
   * cônica não há semieixo, e sem semieixo o fade do quadro seguinte não
   * teria régua para decidir se a linha aparece.
   *
   * O CUSTO por corpo reamostrado são DUAS perguntas ao motor (posição
   * e velocidade) e 256 senos — não 256 perguntas. É o que torna
   * barato reamostrar a cada salto de data em vez de guardar uma curva
   * que envelhece.
   *
   * Devolve se alguma linha foi reescrita.
   */
  escreverInstante(jdTdb: number, fonte: FonteDeOrbitas): boolean {
    if (!Number.isFinite(jdTdb)) return false;
    const centrosVelhos = jdTdb !== this.jdDosCentros;
    let mexeu = false;
    for (const linha of this.linhas) {
      if (centrosVelhos) this.reporCentro(linha, jdTdb, fonte);
      const nunca = !Number.isFinite(linha.jd);
      if (!nunca && (linha.jd === jdTdb || linha.alfa <= ALFA_INVISIVEL)) continue;
      if (this.reamostrar(linha, jdTdb, fonte)) mexeu = true;
    }
    this.jdDosCentros = jdTdb;
    return mexeu;
  }

  /**
   * O centro do laço, no frame da cena. Heliocêntrico: a origem, e nem
   * o motor é consultado. Lua: o pai, pela ponte de frame de sempre.
   */
  private reporCentro(linha: LinhaDeOrbita, jdTdb: number, fonte: FonteDeOrbitas) {
    if (linha.corpo.centro === 'sun') {
      linha.fita.position.set(0, 0, 0);
      return;
    }
    try {
      const p = fonte.posicaoHeliocentrica(linha.corpo.centro, jdTdb);
      this.pontoEq[0] = p.x;
      this.pontoEq[1] = p.y;
      this.pontoEq[2] = p.z;
      const eq = eclipticaParaEquatorial(this.pontoEq);
      linha.fita.position.set(
        eq[0] * AU_PARA_PC,
        eq[1] * AU_PARA_PC,
        eq[2] * AU_PARA_PC
      );
    } catch {
      // fora da janela da tabela o motor LANÇA (adaptação b): a linha
      // some em vez de ficar num lugar velho — a máquina do tempo já
      // avisa o visitante que a fita acabou, e uma órbita ancorada na
      // data errada seria a casa mentindo em silêncio.
      linha.fita.position.set(0, 0, 0);
      linha.jd = Number.NaN;
      linha.semieixoPc = 0;
      linha.apoastroPc = 0;
    }
  }

  /** Reescreve a cônica de uma linha no instante dado. */
  private reamostrar(linha: LinhaDeOrbita, jdTdb: number, fonte: FonteDeOrbitas): boolean {
    if (linha.mu === null) return false;
    let conica: Conica | null = null;
    try {
      conica = conicaOsculadora(
        fonte.posicao(linha.corpo.id, jdTdb),
        fonte.velocidade(linha.corpo.id, jdTdb),
        linha.mu
      );
    } catch {
      conica = null;
    }
    if (conica === null) {
      // A TENTATIVA FICA CARIMBADA, e não é detalhe: sem carimbar, uma
      // linha que falha (fora da janela, estado degenerado) voltaria a
      // ser "nunca amostrada" e o quadro seguinte tentaria de novo — um
      // `throw` por corpo por quadro, para sempre. Com o carimbo, cada
      // instante é tentado UMA vez; o semieixo zerado apaga a linha.
      linha.jd = jdTdb;
      linha.semieixoPc = 0;
      linha.apoastroPc = 0;
      return false;
    }

    // A MESMA PONTE DE FRAME dos dez pontos (`planetas.ts`, D1): uma
    // rotação e uma multiplicação. Um segundo caminho aqui seria a
    // divergência silenciosa entre a linha e o corpo que ela cerca — e
    // como a ponte é LINEAR, girar os DOIS VERSORES da cônica gira o
    // laço inteiro: duas chamadas por corpo, não 256.
    escreverLaco(
      conica,
      eclipticaParaEquatorial(conica.periastro as [number, number, number]),
      eclipticaParaEquatorial(conica.lateral as [number, number, number]),
      AU_PARA_PC,
      this.rascunhoDoLaco,
      PONTOS_POR_ORBITA
    );
    // A DISCIPLINA DO BUFFER (§5): muta-se o array do interleaved e
    // marca-se ELE — nunca `setPositions()`, que alocaria buffer de GPU
    // novo e recomputaria as bounding volumes a cada salto de data. E
    // nunca `computeLineDistances()` (§5c), pela MESMA razão e mais uma:
    // além de alocar buffer novo por chamada, com `gapSize` zero a
    // distância não pinta traço nenhum — recalculá-la aqui seria pagar
    // por quadro para não mudar um pixel. O
    // `needsUpdate` vai no `InstancedInterleavedBuffer` porque os dois
    // atributos (`instanceStart` e `instanceEnd`) são janelas do MESMO
    // array: marcar um atributo não marcaria o outro.
    // o `array` do interleaved é `TypedArray` no tipo e Float32Array de
    // fato — o construtor acima é quem o cria, três linhas de distância
    espelharNaFita(
      this.rascunhoDoLaco,
      linha.segmentos.array as Float32Array,
      PONTOS_POR_ORBITA
    );
    linha.segmentos.needsUpdate = true;
    linha.semieixoPc = conica.semieixoUa * AU_PARA_PC;
    // o apoastro é o raio que o recorte de frustum precisa conhecer — e
    // é o mesmo que decide se a órbita CABE no quadro
    linha.apoastroPc = linha.semieixoPc * (1 + conica.excentricidade);
    (linha.fita.geometry.boundingSphere as THREE.Sphere).radius = linha.apoastroPc;
    linha.jd = jdTdb;
    return true;
  }

  /**
   * O QUADRO: a porta, o fade por tamanho angular, o pai enquadrado e os
   * discos de cessão. Sem alocação e sem tocar em geometria — o que muda
   * aqui é opacidade, visibilidade e quatro números por linha.
   *
   * `tanHalfFov` é o mesmo que o tick já calcula para as outras camadas.
   * `dtS` é o dt do tick, e serve só ao realce do foco (§5b).
   *
   * A CESSÃO É PASSO DESTE QUADRO, e não um segundo telefonema do
   * director — foi assim que ela nasceu, e a auditoria de 25/08 mostrou o
   * preço: apagando a chamada lá fora o disco ficava zerado para sempre, a
   * linha voltava a atravessar o planeta e a suíte inteira seguia verde,
   * porque nenhum teste de Node abre o `director.ts` para ver se ele ainda
   * disca. Dentro do `update` não há fio a cortar: quem apagar a escrita
   * derruba o teste da cessão, e quem apagar o `update` derruba a camada
   * toda.
   *
   * `corpos` é PARÂMETRO, e obrigatório, pela mesma razão: é o Float32Array
   * VIVO de `Planetas.posicoes` (ordem de `IDS_FOTOMETRIA`), a mesma fonte
   * que os rótulos do Atlas leem — nunca uma cópia, que a máquina do tempo
   * desmentiria no primeiro salto de data. Como campo, apagar a linha que o
   * escrevia matava a cessão em silêncio; como parâmetro, apagá-la não
   * compila. `null` — camada dos corpos apagada — devolve a linha inteira,
   * e É uma declaração, não um esquecimento.
   *
   * `fase` É PARÂMETRO PELA MESMÍSSIMA RAZÃO, e a razão vale o dobro aqui:
   * um gate de modo que se pudesse cortar em silêncio devolveria as linhas
   * ao filme sem derrubar teste nenhum, e a decisão 3 do item 77 (§7)
   * voltaria a ser conversa. Como parâmetro obrigatório, apagá-lo não
   * compila — nem no `director.ts`, nem nos quadros de teste que a
   * passam.
   */
  update(
    camera: THREE.PerspectiveCamera,
    quadro: QuadroEmPx,
    tanHalfFov: number,
    dtS: number,
    corpos: Float32Array | null,
    fase: Phase
  ) {
    // O GATE DE FASE, e é o ÚNICO da casa (§7 — autorização DELE de
    // 25/08, item 77 decisão 3: *"tirar do filme (aceito recriar a
    // separação entre modos só aí)"*). O `&&` é a lei inteira: a gaveta
    // continua mandando onde sempre mandou, e o filme tira por cima.
    // Ninguém estende isto a outra camada — ver o mapa em `fases.ts`.
    const desenha = this.ligado && LINHAS_DE_ORBITA_POR_FASE[fase];
    this.group.visible = desenha;
    this.escreverLargura(quadro);
    this.escreverNucleos(camera, quadro, corpos);
    if (!desenha) {
      // CAMADA FECHADA: o realce ENCOSTA no alvo em vez de perseguir no
      // escuro. Sem isto, abrir a gaveta depois de um `?foco=` mostraria
      // as trinta linhas subindo do neutro — animação que ninguém pediu,
      // e que nasceria já atrasada.
      //
      // E É ESTE MESMO RAMO que paga o gate do filme: com os alfas em
      // zero, `escreverInstante` deixa de reamostrar (a guarda por
      // `alfa <= ALFA_INVISIVEL`), então o filme não gasta 30 laços por
      // salto de data para desenhar nada.
      for (const linha of this.linhas) {
        linha.alfa = 0;
        linha.realce = this.realceAlvo(linha);
      }
      return;
    }
    // meia-altura em px de CSS (item 97): buffer ÷ pixelRatio — é a
    // régua de tamanho aparente da casa, a mesma da fita e do clarão
    const meiaAltura = quadro.alturaPx / (2 * quadro.pixelRatio);
    const camPos = camera.position;
    for (const linha of this.linhas) {
      linha.realce = this.perseguirRealce(linha, dtS);
      linha.alfa = this.alfaDa(linha, camera, camPos, meiaAltura, tanHalfFov);
      const aceso = linha.alfa > ALFA_INVISIVEL;
      linha.fita.visible = aceso;
      if (aceso) linha.material.opacity = linha.alfa;
    }
  }

  /**
   * O REALCE AINDA ANDA? (§5b) — a porta de leitura que o `captura` do
   * director soma ao `andando`, no mesmo papel de `atlas.animando` e do
   * véu: mudança JÁ PEDIDA que ainda não chegou segura o obturador.
   */
  get animando(): boolean {
    return this.linhas.some(
      (l) => Math.abs(l.realce - this.realceAlvo(l)) >= REALCE_ASSENTADO
    );
  }

  /** O alvo do multiplicador desta linha (§5b) — ver `realceDoFoco`. */
  private realceAlvo(linha: LinhaDeOrbita): number {
    return realceDoFoco(linha.corpo, this.foco);
  }

  /** Um passo do realce rumo ao alvo, com encosto (§5b). */
  private perseguirRealce(linha: LinhaDeOrbita, dtS: number): number {
    const alvo = this.realceAlvo(linha);
    // SEM RELÓGIO NÃO HÁ TRANSIÇÃO, e o encosto é imediato: um `dtS`
    // ausente, zero ou negativo (quadro sem tempo, teste que só quer o
    // regime permanente) nunca deixa o realce preso no meio do caminho.
    if (!(dtS > 0)) return alvo;
    const resto = alvo - linha.realce;
    if (Math.abs(resto) < REALCE_ASSENTADO) return alvo;
    return alvo - resto * Math.exp(-VELOCIDADE_DO_REALCE * dtS);
  }

  /** O fade de uma linha: as duas pontas do §5, mais o pai enquadrado. */
  private alfaDa(
    linha: LinhaDeOrbita,
    camera: THREE.PerspectiveCamera,
    camPos: THREE.Vector3,
    meiaAltura: number,
    tanHalfFov: number
  ): number {
    if (!Number.isFinite(linha.jd) || !(linha.semieixoPc > 0)) return 0;
    const centro = linha.fita.position;
    const d = camPos.distanceTo(centro);
    if (!(d > 0) || !(tanHalfFov > 0)) return 0;

    // A CÂMERA DENTRO DO LAÇO é o corte que não é escolha de gosto: se
    // ela está mais perto do centro que o apoastro, a órbita ENVOLVE o
    // observador e não existe lente que a enquadre — de dentro da órbita
    // da Terra, a órbita da Terra é um risco dando a volta no céu. Foi o
    // que a primeira foto mostrou (a órbita da Terra atravessando o
    // enquadramento da Lua a meia força) e o que a régua de tamanho
    // angular não pegava sozinha: `r/d` aproxima seno por ângulo, e a
    // aproximação morre exatamente aqui, onde r/d → 1.
    if (d <= linha.apoastroPc) return 0;

    // A PONTA DE BAIXO é uma pergunta de PIXEL ("dá para ver a curva?"),
    // e ali o ângulo é pequeno e a aproximação vale: o semieixo é a
    // medida do tamanho típico do laço.
    const raioPx = ((linha.semieixoPc / d) / tanHalfFov) * meiaAltura;
    const entra = THREE.MathUtils.smoothstep(raioPx, RAIO_MIN_PX, RAIO_CHEIO_PX);
    if (entra <= 0) return 0;

    // A PONTA DE CIMA é uma pergunta de ÂNGULO ("cabe no quadro?"), e
    // ali a aproximação não vale mais: a conta é o semi-ângulo de
    // TANGÊNCIA ao apoastro contra o semi-ângulo vertical da lente.
    const raioAngular = Math.asin(
      Math.min(1, linha.apoastroPc / d)
    );
    const sai =
      1 -
      THREE.MathUtils.smoothstep(
        raioAngular / Math.atan(tanHalfFov),
        CABE_NO_QUADRO,
        FORA_DO_QUADRO
      );
    if (sai <= 0) return 0;

    if (linha.corpo.centro !== 'sun' && !this.paiEnquadrado(centro, camera)) return 0;
    // O REALCE ENTRA POR ÚLTIMO (§5b), e por isso não abre porta nenhuma:
    // quem já foi cortado pelas duas pontas ou pelo pai fora do quadro
    // continua cortado, por mais que esteja em foco. O foco escolhe o
    // ASSUNTO entre as linhas que a cena já decidiu mostrar.
    return BRILHO_DA_LINHA * entra * sai * linha.realce;
  }

  /** O pai está no quadro? (§5 — só as luas perguntam.) */
  private paiEnquadrado(centro: THREE.Vector3, camera: THREE.PerspectiveCamera): boolean {
    this.centroDoPai.copy(centro);
    const ndc = this.rascunhoNdc.copy(this.centroDoPai).project(camera);
    // atrás da câmera o `project` devolve NDC dentro da caixa com z > 1
    if (ndc.z > 1) return false;
    return (
      Math.abs(ndc.x) <= MARGEM_DO_PAI_NDC && Math.abs(ndc.y) <= MARGEM_DO_PAI_NDC
    );
  }

  /** `?dbgorbitas` — que linha está acesa, com que raio e por quê. */
  dbg(): string {
    const linhas = [
      `[dbgorbitas] ${this.linhas.length} órbitas · ${this.acesas} acesas · ` +
        `camada ${this.ligado ? 'ligada' : 'desligada'}` +
        // GAVETA ABERTA E MESMO ASSIM SEM LINHA é o estado novo do §7, e
        // um readout que só falasse da gaveta mandaria quem depura
        // procurar defeito onde há decisão
        `${this.ligado && !this.group.visible ? ' (fora: o filme não tem linha)' : ''} · ` +
        `foco=${this.foco ?? '—'}${this.animando ? ' (andando)' : ''}`,
    ];
    for (const l of this.linhas) {
      if (!l.fita.visible) continue;
      linhas.push(
        `[dbgorbitas] ${l.corpo.id.padEnd(9)} centro=${l.corpo.centro.padEnd(8)} ` +
          `a=${(l.semieixoPc / AU_PARA_PC).toFixed(6)} UA · ` +
          `alfa=${l.alfa.toFixed(4)} · realce=${l.realce.toFixed(2)} · jd=${l.jd}`
      );
    }
    return linhas.join('\n');
  }

  dispose() {
    for (const linha of this.linhas) {
      linha.fita.geometry.dispose();
      linha.material.dispose();
    }
    this.linhas.length = 0;
    this.group.clear();
  }
}
