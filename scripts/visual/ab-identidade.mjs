// Serve: chão — mudança que move imagem não passa calada: md5 das 54 vistas, antes × depois
// Custo: 4,0 min por lado (54 vistas = 56 capturas, JOBS=6) (SMOKE=1: 0,4 min por lado)
//   SEM TIL: o preço voltou a ser MEDIDO em 31/08 (item 84, `DOZERO=1` na mesma
//   máquina) — 4,0 min. Ele estimava 3,6 desde o item 108, quando a conta por
//   captura substituiu a medição para não gastar 7 min de GPU só reaferindo.
//   A dívida se pagou junto com a leva que as TRÊS vistas de Atlas do item 84
//   exigiram: o que manda no relógio é o BALDE MAIOR, que foi de 9 para 10
//   capturas no round-robin, e 3,5 × 10/9 = 3,9 previa quase certo.
// Prova de que uma mudança NÃO mexeu na imagem: md5 das mesmas vistas antes
// e depois.
//
//   node scripts/visual/ab-identidade.mjs antes      # no HEAD, antes de editar
//   ...edita...
//   node scripts/visual/ab-identidade.mjs depois     # compara e dá o veredito
//   node scripts/visual/ab-identidade.mjs antes interno   # uma vista só
//   SMOKE=1 node scripts/visual/ab-identidade.mjs antes   # 4 vistas-sentinela
//   JOBS=1 node scripts/visual/ab-identidade.mjs antes    # serial (padrão: 6)
//   DOZERO=1 node scripts/visual/ab-identidade.mjs depois # ignora o disco à força
//
// A RETOMADA DE DISCO NÃO ATRAVESSA MAIS UMA EDIÇÃO. Cada lado grava, ao lado
// dos md5, o CARIMBO DO CÓDIGO que os produziu — e desde o item 113 (F2) o
// carimbo é de CONTEÚDO, não de commit: o hash da ÁRVORE de trabalho
// (`write-tree` num índice descartável, ver `carimboDoCodigo`). Um commit que
// não muda conteúdo não move o carimbo, então o `antes` da rodada seguinte
// continua valendo depois do commit da anterior — eram ~8 min de recaptura
// jogados fora por rodada encadeada. Na entrada, carimbo diferente = estado
// de outro binário: descartado, com linha na tela. E o lado `antes` pode
// SEMEAR do último estado de QUALQUER lado (antes ou depois) cujo carimbo de
// árvore seja igual — com linha dizendo de onde semeou; o `depois` nunca
// semeia do outro lado: as capturas dele são a prova. `DOZERO=1` continua de
// pé como força bruta (recapturar o MESMO código), e sem git o carimbo vira
// `sem-git` e a retomada volta a ser cega — declarada, não silenciosa.
//
// POR QUE NÃO `--virtual-time-budget --screenshot`, que é como `rodada.mjs`
// captura: o orçamento de tempo virtual acelera TIMERS, não a REDE. Os ~6 MB
// de cartografia e o pool de nuvens-semente chegam antes ou depois dele
// conforme a sorte, e a MESMA vista sai em estados diferentes. Medido em
// 2026-08-07 no mesmo commit: t=100 devolveu a60fe9ce / 40f306d2 / effb3b85 em
// três capturas, com e sem `?q=cinema`, com orçamento de 16 s e de 32 s.
// Aqui a captura ESPERA — e o QUE ela espera mudou na reforma de 2026-08-11:
//
//   ANTES: o log da cartografia e mais 700 quadros desenhados depois dele.
//   Funcionava, e custava ~70 s POR CAPTURA (a leva roda a ~10 fps numa vista
//   de 1800×1800): 30 capturas = ~45 min, quase tudo esperando no escuro.
//   700 nunca foi medido — era folga escolhida quando o virtual time falhou.
//
//   AGORA: o SINAL do próprio app, `window.__director.captura.pronto` (ver o
//   getter `captura` em `src/three/director.ts`), que só sobe quando o `init`
//   terminou, nada está andando, o Sol tem retrato completo publicado e a
//   cena já desenhou 10 quadros sem perturbação. ~6 s por captura. Sondado
//   antes de trocar: `sol`, `travessia` e `soldisco` já devolvem o md5
//   OFICIAL no primeiro quadro depois do deep-link — nos marcos 1, 2, 3, 5,
//   10, 30, 80, 320 e 700 o hash é o mesmo. O MÉTODO desde o item 113 (F3),
//   dito com honestidade: UMA sessão de Chrome por balde e navegação LIMPA
//   por vista (documento novo por `ir()` + storage da origem zerado antes de
//   cada navegação — o padrão provado no atlas-smoke, 91 navegações numa
//   sessão), captura ADAPTATIVA (1× por vista; ×2 nas duas pinadas trêmulas
//   e na re-mira de quem DIFERE), tier pinado, md5 bit-exato. Quem valida a
//   troca de motor não é este parágrafo: é a PROVA A/A — os dois lados no
//   MESMO código, todas as vistas IGUAL. Medida em 2026-08-30: o `antes` a
//   JOBS=3 contra DOIS `depois` independentes a JOBS=6 — 50/50 IGUAL nas
//   duas levas, zero INSTÁVEL, todas as capturas por via=sinal.
//   O critério antigo continua vivo como TETO DE SEGURANÇA: se o sinal não
//   existir (bundle de produção — `window.__director` só é publicado em DEV)
//   ou não subir, a captura cai nos 700 quadros em vez de travar. A coluna
//   `via=` de cada linha diz por qual caminho ela assentou; uma leva inteira
//   em `via=quadros` é sinal quebrado, não lentidão de hardware — e desde
//   2026-08-11 isso não é só um aviso no rodapé: no alvo padrão, QUALQUER
//   captura por `quadros` faz o gate imprimir o bloco de erro e SAIR ≠ 0
//   (`julgarProntidao` em chrome.mjs). `FALLBACK_OK=1` aceita de propósito.
//
// PARALELISMO POR DIVISÃO DA LISTA (`JOBS=N`, padrão 6): o pai reparte as
// vistas entre N processos-filhos independentes, cada um com o SEU Chrome e o
// SEU perfil; o dev server é um só (serve estático, aguenta). Nunca N abas ou
// contextos num Chrome só — a bit-exatidão sob GPU compartilhada não está
// documentada em lugar nenhum, e o gate inteiro depende dela. Cada filho grava
// o seu arquivo de estado e o pai funde no JSON de sempre, no formato exato de
// antes. `JOBS=1` roda tudo em processo, em série — é assim que se isola a
// prova do sinal da prova do paralelismo.
//
// LEIA O VEREDITO CERTO: md5 igual prova igualdade; md5 diferente NÃO prova
// diferença — pode ser captura não assentada. Por isso a RE-MIRA (F3a do
// item 113): vista que DIFERE na captura única volta ×2 nos dois lados antes
// do veredito final — no `antes` só quando o carimbo dele é o código ATUAL
// (A/A, knob por `EXTRA=`); num A/B de verdade o binário do `antes` já não
// existe, e recapturá-lo com o código novo envenenaria a baseline. A marca
// INSTÁVEL fica para quem não repete o próprio md5. E "DIFERE" pede o passo
// seguinte, não a conclusão: rodar o diff de pixel. Diferença de 1 nível
// espalhada por dezenas de pixels é 1 ULP do compilador (reordenar aritmética
// ao mudar um `if` já basta), não conteúdo que sumiu.
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  readFileSync, writeFileSync, existsSync, rmSync, mkdirSync, copyFileSync,
} from 'node:fs';
import { resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { abrirSessao, julgarProntidao, APP_PADRAO } from './chrome.mjs';

const LADO = process.argv[2] || 'antes';
const SO = process.argv[3];
// A CAPTURA É ADAPTATIVA (F3a do item 113): 1× por vista — a 2ª captura só
// separa DIFERE de INSTÁVEL, informação que só é consumida quando os lados
// divergem, então ela virou re-mira sob demanda (ver `pai`). EXCEÇÃO PINADA:
// as duas vistas documentadas TRÊMULAS (o tremor é do anel de Saturno — ver o
// bloco de `foco-titan` na lista) continuam SEMPRE em ×2, senão o tremor
// conhecido delas viraria re-mira em toda leva.
const PINADAS_N2 = ['foco-titan', 'saturno-anel'];
const capturasDaVista = (nome) => (PINADAS_N2.includes(nome) ? 2 : 1);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
// EXPORTADA porque a régua 3 (`planeta-pixel.mjs`) mede as MESMAS vistas
// profundas com as MESMAS strings de deep-link. Redigitar `?pos=0,0,0.00072722`
// num segundo arquivo compraria uma divergência silenciosa: a régua diria
// "medido a 0,5 px" de uma câmera que não é a do md5 oficial.
export const VISTAS = [
  // O ATO DO SOL não tinha vista, e as duas alavancas que sobram na fila de
  // performance (nebulosa atrás da fotosfera, LUT do flick da coroa) vivem
  // inteiras aqui: t=0..12 para uma, t=0..~20 para a outra. Com a lista
  // começando em t=40, o gate era cego justamente para elas — e é o trecho
  // mais olhado do filme. t=6 pega o Sol grande na tela, com coroa, raias e
  // proeminências vivas.
  ['sol', '?t=6&shot=2'],
  ['interno', '?t=40&shot=2'],
  ['travessia', '?t=100&shot=2'],
  ['mergulho', '?t=180&shot=2'],
  ['edgeon', '?t=153&shot=2'],
  ['faceon', '?t=167&shot=2'],
  // RETRATO POR PADRÃO, não opt-in. Os três harnesses do repo capturam em 1:1
  // (rodada 1800x1800, sky 1440x1440, este 1800x1800), e defeito que dependa
  // do ASPECTO da tela é invisível para todos eles. Foi exatamente o caso da
  // margem lateral do recorte de sprite da galáxia: a versão errada passava
  // nas cinco vistas quadradas. Uma sonda que alguém precisa lembrar de rodar
  // não fecha buraco nenhum — por isso esta linha, e não uma variável de
  // ambiente. 700x1800 dá aspecto 0,40, abaixo do limiar onde a margem
  // derivada só da altura começa a apagar ponto.
  ['retrato', '?t=100&shot=2', '700x1800'],
  // ------------------------------------------------------------------
  // ONDA 3 — as vistas que faltavam para o motor estelar (Estado da Onda 3
  // pede "Sol pixel-igual em 4 condições e heroes em 3 distâncias"; nenhuma
  // existia). `?t=` não serve: o instante amarra a distância ao trajeto da
  // hélice, e o que se quer medir é a DISTÂNCIA. `?pos=&look=` (App.tsx:137-145)
  // crava a câmera no ponto exato — aqui, olhando a origem (o Sol) ou a estrela.
  //
  // As 4 do Sol caem uma em cada regime do crossfade disco↔clarão
  // (lodStellar.ts): 0,10 pc = disco pleno (uWorldFade 1, uGain 0); 0,25 =
  // meio da rampa do disco (uWorldFade 0,5, uGain 0,77); 0,32 = o estouro,
  // logo antes do corte duro de custo `world > 0.02` que cai em 0,3249 pc
  // (uWorldFade 0,034, uGain 1, uCore 0,07 — é a vista que denuncia se
  // alguém mover uma casa decimal); 0,50 = estrela pura (grupo do disco
  // apagado, uGain e uCore em 1).
  ['soldisco', '?pos=0,0,0.1&look=0,0,0&shot=2'],
  // solrampa → cortada (113 i): as pontas soldisco/solestouro/solestrela seguram o crossfade.
  ['solestouro', '?pos=0,0,0.32&look=0,0,0&shot=2'],
  ['solestrela', '?pos=0,0,0.5&look=0,0,0&shot=2'],
  // AS TRÊS DO SOL REAL (F1 da onda do Sol real) — a resposta com imagem
  // à frase de `config.ts:8`, "escala real seria invisível". Elas
  // nasceram carregando `?solreal=1`, a porta que construía o Sol com o
  // raio FÍSICO; a F3 tornou esse raio o PADRÃO e a porta morreu, então
  // as três URLs perderam o `&solreal=1` e passaram a ser vistas comuns.
  // O md5 delas NÃO se move nessa troca, e isso é aritmética: a porta só
  // escolhia o raio, e o raio que elas pediam é o que o app agora
  // constrói sozinho. É a conferência mais barata da fase inteira.
  //
  // As distâncias, e cada uma responde uma pergunta diferente:
  //  4 milhões de km (1,2963e-7 pc) = 5,74 raios solares — a distância
  //    de onde o Sol REAL enche 76% da altura do quadro, ou seja a mesma
  //    parede de fogo da abertura, filmada num lugar que existe (a
  //    Parker Solar Probe chega a 9,9 raios). É a foto que prova que não
  //    é preciso inflar nada para ter o plano.
  //  1 UA (4,84814e-6 pc) = o Sol do tamanho que se vê da janela de
  //    casa: 0,53° de diâmetro angular. É a foto da aferição — se este
  //    disco sair com outro tamanho, a conta está errada em algum lugar.
  //  40 UA (1,93926e-4 pc) = a órbita de Plutão. É a foto que mostra o
  //    que "estrela longe é PONTO, não invisível" quer dizer.
  ['solreal4mkm', '?pos=0,0,0.00000012963&look=0,0,0&shot=2'],
  // a fotosfera com SIRIUS (m −1,44) exatamente ATRÁS do disco — a vista
  // que faltava quando "vejo estrelas através do sol" (item 47) viveu sem
  // régua: nenhuma das 51 tinha estrela brilhante atrás de corpo. Câmera
  // no anti-Sirius a 4 mi km, mirando a origem.
  ['solatras', '?pos=0.0000000243031,-0.000000121752,0.0000000372805&look=0,0,0&shot=2'],
  ['solreal1ua', '?pos=0,0,0.0000048481&look=0,0,0&shot=2'],
  // solreal40ua → ua40 (mesma URL, item 113): a vista das 40 UA vive na Onda 4.
  // As de hero são Betelgeuse (152,67 pc de casa, a supergigante do Ato II),
  // a câmera na PRÓPRIA reta Sol→estrela. As três distâncias são os três
  // regimes do `farFade` do billboard (heroStars.ts:58, 320→900 pc): 200 pc
  // = presença 1; 600 = meio da rampa (0,526); 950 = presença 0, o hero não
  // desenha mais e só o ponto do catálogo sobra. As três ficam com dHome
  // abaixo de 1200, senão o corte de director.ts:885 desligaria o grupo
  // inteiro e as três vistas mediriam a mesma coisa (nada).
  //
  // E `hero8`, a QUARTA: medida antes de escolher as outras três, o
  // billboard de Betelgeuse tem RAIO de 0,45 px a 200 pc, 0,15 a 600 e 0,10
  // a 950 — o tamanho na tela é `uSize/(d·tan29°)` e não depende da lente
  // (o `uZoom` cancela o fov de propósito, heroStars.ts:14-16). Ou seja: as
  // três vistas do farFade são regimes do CONTRATO, mas nelas o hero é
  // sub-pixel, e a dupla-luz hero↔catálogo que a fase 3 vai desfazer não
  // aparece em nenhuma. A 8 pc o mesmo billboard tem 11,3 px de raio: é a
  // única em que se PODE ver o hero e o ponto do catálogo somando luz na
  // mesma posição — a vista que julga a decisão D2.
  //
  // [fase 3, correção de fato] "a única" vale para BETELGEUSE, não para
  // as 16. Perto de casa a soma de luz é a REGRA: a 0,06 pc oito das 16
  // têm billboard maior que o próprio ponto, e nas quatro vistas do Sol
  // é α Centauri (1,4 pc) quem soma as duas luzes dentro do quadro —
  // medido com `?dom=1`, são elas e a hero8 que mudam quando a cessão
  // liga. hero8 continua julgando a D2 em Betelgeuse; as do Sol julgam
  // o caso vizinho, que é o mais comum.
  ['hero200', '?pos=7.3677,349.6513,45.4654&look=3.1895,151.3642,19.682&shot=2'],
  // hero600 → cortada (113 i): billboard de 0,15 px de raio — sub-pixel; hero200/hero950 são as pontas do farFade.
  ['hero950', '?pos=23.0362,1093.2277,142.1532&look=3.1895,151.3642,19.682&shot=2'],
  ['hero8', '?pos=3.0224,143.4327,18.6507&look=3.1895,151.3642,19.682&shot=2'],
  // ------------------------------------------------------------------
  // ONDA 4 — o DOMÍNIO PROFUNDO, em UA. Nenhuma das 15 acima chega perto
  // do Sol na escala do sistema solar: a mais próxima é `sol`, a 0,063151
  // pc = ~13.000 UA, e o piso do filme inteiro é essa distância. As três
  // abaixo caem ABAIXO do piso, onde a Onda 4 dissolve a fotosfera
  // artística e acende os planetas por fotometria — a única faixa em que
  // o gate pode enxergar o frame local em UA de dentro.
  //
  // `?pos=` e não `?t=`: o instante amarra a distância ao trajeto da
  // hélice, e o que se quer cravar é a DISTÂNCIA. Câmera no eixo z da
  // cena olhando a origem (o Sol), como as quatro do Sol acima.
  //
  // ELAS ENTRAM NA LISTA ANTES DE QUALQUER CÓDIGO DA ONDA, de propósito:
  // a baseline delas nasce no HEAD sem a onda, e é isso que desarma a
  // armadilha do veredito (vista sem "antes" saía como linha NOVA e não
  // como comparação). No "antes" as três mostram só o fundo — o `near`
  // atual clipa tudo a menos de ~206 UA da câmera —, e esse fundo é a
  // baseline legítima contra a qual o "depois" vai diferir.
  //
  // As distâncias (o conversor é AU_PARA_PC = 1/206264,80624548031):
  //   ua500 = 0,0024241 pc = 500,01 UA — Sol-estrela, Júpiter fraco
  //   ua150 = 0,00072722 pc = 150,00 UA — o desfile a olho nu, sistema
  //           inteiro em quadro (escorço 0,917, quase face-on)
  //   ua40  = 0,00019393 pc = 40,00 UA — a família como faróis, na
  //           travessia da órbita de Netuno
  ['ua500', '?pos=0,0,0.0024241&look=0,0,0&shot=2'],
  ['ua150', '?pos=0,0,0.00072722&look=0,0,0&shot=2'],
  ['ua40', '?pos=0,0,0.00019393&look=0,0,0&shot=2'],
  // ------------------------------------------------------------------
  // OS DEGRAUS DO VÃO (2026-08-14) — a outra metade do item 12.
  //
  // A escada que OLHA O SOL tinha `solreal1ua` de um lado e `solreal40ua`
  // do outro, SEM NENHUM DEGRAU NO MEIO — e é exatamente essa faixa que o
  // item 3 acusa. O buraco não é acadêmico: medido com a régua da luz
  // (`luz-do-quadro.mjs`), de 1 a 500 UA o quadro sai com 100% dos pixels
  // acima de meia luz e a mancha branca ocupa a tela inteira, enquanto o
  // disco VERDADEIRO do Sol cai de 7,6 px para 0,02 px. Quatro ordens de
  // grandeza de encolhimento sem um juiz olhando.
  //
  // POR QUE ELES ENTRAM ANTES DO CONSERTO, e não depois: a regra da casa é
  // que a prova tem de TOCAR o que a mudança tocou, e que quem não tem
  // vista cobrindo a mudança é OBRIGADO a criar a vista, nunca a exibir a
  // que não cobre (`NORTE.md`, seção “Como medir”). Estas cinco nascem lavadas de
  // propósito — é a baseline do defeito. Quando a reconciliação
  // radiométrica chegar, é contra elas que ela responde.
  //
  // AS CINCO, e cada uma responde uma pergunta:
  //   ua2   — o Sol ainda é CORPO (o gate do palco arma abaixo de 3,60 UA);
  //   ua4   — o primeiro passo depois do arme, onde o disco tem ~4 px;
  //   ua8   — logo depois de o corpo DESARMAR (2 px, 7,19 UA): aqui só o
  //           ponto desenha o Sol, e é o degrau em que a pupila expôs o
  //           salto de luz entre as duas representações;
  //   ua20  — o meio da faixa cega, sem nenhuma outra vista por perto;
  //   ua2000 — a ponta LONGE do vão, onde o branco finalmente começa a
  //           ceder (91,8% do quadro) e ainda faltam 2.125 UA para o
  //           clarão com espinhos acender em 0,02 pc.
  // Todas ficam ABAIXO da janela de entrega (a maior, ua2000, está a
  // 0,0096963 pc — 2,06× abaixo da borda), então nenhuma passa a depender
  // da rampa; `lodStellar.test.ts` cobra isso e conta quantas são.
  ['ua2', '?pos=0,0,0.0000096963&look=0,0,0&shot=2'],
  ['ua4', '?pos=0,0,0.000019393&look=0,0,0&shot=2'],
  ['ua8', '?pos=0,0,0.000038785&look=0,0,0&shot=2'],
  ['ua20', '?pos=0,0,0.000096963&look=0,0,0&shot=2'],
  ['ua2000', '?pos=0,0,0.0096963&look=0,0,0&shot=2'],
  // ------------------------------------------------------------------
  // ONDA 6 (F2a) — A TERRA RESOLVIDA, no jd PINADO da onda
  // (2024-04-08, o mesmo do eclipse de F2c — a época viva não captura).
  // A câmera fica a 4 raios do CENTRO da Terra viva (efeméride pelo
  // ?jd=), do lado ILUMINADO, 35° fora do eixo Terra→Sol: mais de meio
  // disco aceso (a lição do negate da Onda 5), terminador e lado
  // noturno em quadro — dia, noite, nuvens e limbo da atmosfera numa
  // captura só (~795 px de diâmetro em 1800 px). Os números saíram da
  // MESMA cadeia do app (efemerides.bin → eclipticaParaEquatorial →
  // AU_PARA_PC), calculados uma vez e pinados aqui como os ?pos= acima.
  [
    'terra',
    '?pos=-0.0000045882235587153385,-0.0000014555632225072523,-6.307425015010789e-7'
      + '&look=-0.0000045890070378484725,-0.000001455314175436054,-6.308304960541221e-7'
      + '&jd=2460409.26395835&corpos=1&shot=2',
  ],
  // terranb → cortada (113 i): o gate T-E10 fica com os três heróis declarados mercurionb/venusnb/titannb.
  // ------------------------------------------------------------------
  // ONDA 6 (F2b) — A LUA RESOLVIDA, no MESMO jd pinado da onda (que é o
  // dia do eclipse solar de 2024: a Lua está entre o Sol e a Terra, e o
  // lado voltado ao Sol — o que a câmera vê — está aceso).
  //
  // `lua`: a câmera a 4 raios lunares, 20° fora do eixo Lua→Sol — disco
  // de ~795 px, quase cheio. É a vista que JULGA a lei de
  // Lommel-Seeliger a olho: o disco tem de ler CHATO com borda dura
  // (regolito), não esfera sombreada de Lambert — o fato fotométrico
  // que se confere contra uma fotografia.
  //
  // `terralua`: o primeiro PAR da casa — a câmera além da Lua (lado do
  // Sol), 20° fora do eixo Terra→Lua, olhando a TERRA: a Lua resolvida
  // a ~404 px em primeiro plano e a Terra a ~55 px ao fundo, sem
  // oclusão (20° contra 7,1° de raio angular da Lua), os dois
  // iluminados. Números da MESMA cadeia do app (efemerides.bin →
  // eclipticaParaEquatorial → AU_PARA_PC), calculados uma vez e
  // pinados como os ?pos= acima.
  [
    'lua',
    '?pos=-0.000004577765217805196,-0.0000014518586579005272,-6.2925581919652e-7'
      + '&look=-0.000004577990409167882,-0.000001451855297832381,-6.292543536189472e-7'
      + '&jd=2460409.26395835&corpos=1&shot=2',
  ],
  [
    'terralua',
    '?pos=-0.000004577540038198493,-0.0000014518632898141814,-6.292550387276077e-7'
      + '&look=-0.0000045890070378484725,-0.000001455314175436054,-6.308304960541221e-7'
      + '&jd=2460409.26395835&corpos=1&shot=2',
  ],
  // ------------------------------------------------------------------
  // ONDA 6 (F2c) — O ECLIPSE DOS DOIS LADOS, nos jd PINADOS de
  // da onda de eclipses (máximos segundo a NOSSA efeméride). Entram na lista
  // ANTES do código da fase (regra da Onda 4): a baseline nasce no HEAD
  // sem o ramo de sombra — as duas vistas DIFEREM de propósito quando o
  // eclipse acende, e o "depois" é quem vira oficial (D11).
  //
  // `eclipse-solar` (?jd=2460409.26395835, o MESMO das vistas terra/lua —
  // 2024-04-08): a câmera a 2 raios terrestres do centro, na direção de
  // ENTRADA do eixo da sombra na superfície ((perp − √(R²−perp²)·û)/R,
  // perp = 2.191 km do gamma 0,3431) — a mancha cai no centro do quadro.
  // TAMANHOS DECLARADOS (projetor validado contra as capturas oficiais a
  // 2 px, fov 58, buffer 1800×1713): umbra r ≈ 94 km ⇒ ~45 px de
  // diâmetro centrada em (900,856); penumbra r ≈ 3.389 km ⇒ gradiente
  // linear até ~690 px do centro (o disco tem 1.433 px — quase inteiro
  // dentro da penumbra). O `look` REUSA o pino do centro da Terra da
  // vista `terra` (a mesma efeméride, o mesmo jd).
  //
  // `eclipse-lunar` (?jd=2458327.34980323 — 2018-07-27, a mais longa do
  // século): a câmera a 4 raios lunares do centro da Lua, do lado da
  // TERRA (= lado diurno na lua cheia eclipsada, Sol e Terra a 0,11° um
  // do outro vistos da Lua), olhando a Lua: o disco de ~757 px INTEIRO é
  // o efeito — a Lua funda na umbra (folga 2.049 km), cobre de Danjon
  // (o piso PISO_REFRACAO_LUNAR × COR_REFRACAO_LUNAR da lib) vezes a
  // EXPOSIÇÃO DO OBSERVADOR da decisão do dono (EV_OBSERVADOR_ECLIPSE_LUNAR
  // = 10 — declarada na lib como exposição, não dado físico; sem ela o
  // piso honesto quantiza para ~0 e a Lua renderiza preta). Tamanho
  // declarado: a blood moon É o disco inteiro, 757 px.
  [
    'eclipse-solar',
    '?pos=-0.0000045886355123391084,-0.0000014552661812675914,-6.306556615181776e-7'
      + '&look=-0.0000045890070378484725,-0.000001455314175436054,-6.308304960541221e-7'
      + '&jd=2460409.26395835&corpos=1&shot=2',
  ],
  [
    'eclipse-lunar',
    '?pos=0.0000027957670917923275,-0.0000037323592589660634,-0.0000016179729540998382'
      + '&look=0.0000027958946899936873,-0.000003732529698720039,-0.0000016180463950766712'
      + '&jd=2458327.34980323&corpos=1&shot=2',
  ],
  // ITEM 95 — O ECLIPSE NO LIMBO, a vista que julga o AR na sombra.
  // As duas de cima põem a mancha no MEIO do disco, e ali a atmosfera
  // não pesa: sobre o disco o depth da superfície mata a casca, e o que
  // sobra do ar é o anel de limbo, longe da mancha. O defeito do item 95
  // mora justamente onde essas duas não olham.
  //
  // `eclipse-limbo` (?jd=2461265.241840278 — 2026-08-12 17:48 UTC, o
  // máximo segundo a NOSSA efeméride): o total RASANTE sobre a Islândia
  // e a Espanha, gamma 0,8964 — a sombra raspa o limbo norte em vez de
  // furar o meio do disco. Umbra r ≈ 53 km, penumbra r ≈ 3.430 km. A
  // câmera fica a 2 raios terrestres do centro, 11,3° fora do eixo
  // Terra→Sol PARA LONGE da mancha, de modo que o ponto sob a sombra caia
  // a 75° do eixo da câmera — 0,966 do raio do disco, dentro do anel de
  // atmosfera, que é onde a casca é brilhante. O `look` é o centro da
  // Terra na mesma efeméride e no mesmo jd.
  [
    'eclipse-limbo',
    '?pos=0.0000037447483183244700,-0.0000029167355069276228,-0.0000012644663511367701'
      + '&look=0.0000037450523018411245,-0.0000029170137720666862,-0.0000012644989746445182'
      + '&jd=2461265.241840278&corpos=1&shot=2',
  ],
  // ------------------------------------------------------------------
  // ONDA 6 (F3) — OS ROCHOSOS, no MESMO jd pinado da onda
  // (2024-04-08). Entram ANTES do código da fase (regra da Onda 4): a
  // baseline nasce no HEAD sem os meshes, e o "depois" vira oficial
  // (D11). A câmera fica a 4 raios do centro, 20° fora do eixo
  // corpo→Sol pelo lado ILUMINADO (o padrão da vista `lua`: disco
  // quase cheio, ~757 px de diâmetro em 1800×1713 — é a geometria em
  // que Lommel-Seeliger se julga a olho: o disco cheio lê CHATO, não
  // Lambertiano). Números da MESMA cadeia do app (efemerides.bin →
  // eclipticaParaEquatorial → AU_PARA_PC), pinados como os ?pos= acima.
  //
  // `mercurio`: regolito LS (C=4/3 derivado) a 0,4034 UA — E(real)=6,14.
  // O par &nobloom=1 é GATE (T-E10): Mercúrio e Vênus cruzam o limiar
  // de bloom 0,82 no subsolar, e a recalibração σ×bloom se lê AQUI, sem
  // o clarão na frente. O px do efeito julgado: o disco INTEIRO, 757 px.
  //
  // `venus`: topo de nuvens a 0,7275 UA — E(real)=1,89. O albedo alto
  // faz Vênus o caso mais brilhante da casa: é o herói da recalibração
  // (subsolar vs o limiar 0,82), julgado no par &nobloom=1 com número,
  // não a olho. Mesmo px declarado: 757 px de disco.
  [
    'mercurio',
    '?pos=-0.0000019148588355801608,-3.9725638498650736e-7,-1.3749003726820043e-8'
      + '&look=-0.0000019151695742340926,-3.9722379598669784e-7,-1.3699318312906234e-8'
      + '&jd=2460409.26395835&corpos=1&shot=2',
  ],
  [
    'mercurionb',
    '?pos=-0.0000019148588355801608,-3.9725638498650736e-7,-1.3749003726820043e-8'
      + '&look=-0.0000019151695742340926,-3.9722379598669784e-7,-1.3699318312906234e-8'
      + '&jd=2460409.26395835&corpos=1&shot=2&nobloom=1',
  ],
  [
    'venus',
    '?pos=0.0000033711554193735603,-8.460975885052472e-7,-5.940024469150652e-7'
      + '&look=0.00000337178324480784,-8.465120134658821e-7,-5.942250012794021e-7'
      + '&jd=2460409.26395835&corpos=1&shot=2',
  ],
  [
    'venusnb',
    '?pos=0.0000033711554193735603,-8.460975885052472e-7,-5.940024469150652e-7'
      + '&look=0.00000337178324480784,-8.465120134658821e-7,-5.942250012794021e-7'
      + '&jd=2460409.26395835&corpos=1&shot=2&nobloom=1',
  ],
  // ------------------------------------------------------------------
  // ONDA 6 (F4) — OS GIGANTES + ANEL, no MESMO jd pinado da onda
  // (2024-04-08). Entram ANTES do código da fase (regra da Onda 4): a
  // baseline nasce no HEAD sem os meshes, e o "depois" vira oficial
  // (D11). Números da MESMA cadeia do app (efemerides.bin →
  // eclipticaParaEquatorial → AU_PARA_PC), pinados como os ?pos= acima.
  //
  // `jupiter`: câmera a 4 raios equatoriais do centro, 20° fora do eixo
  // corpo→Sol pelo lado ILUMINADO (o padrão da vista `lua`/`mercurio`:
  // disco ~757 px em 1800×1713). E(real)=0,0399 a 5,006 UA.
  //
  // `saturno-anel`: NÃO é o disco cheio a 4 raios — a 5,73° de latitude
  // subsolar o anel leria quase de perfil e a sombra no disco some no
  // equador. Câmera a 6 raios equatoriais, 20° de azimute em torno do
  // polo (a mesma receita) e +18° de elevação rumo ao polo norte
  // (latitude da câmera 23,7°): GLOBO (~510 px) + ANEL (eixo maior
  // ~1143 px, cabe no 1800×1713) + SOMBRA DO ANEL no disco. A sombra
  // cai em lat −0,6° (borda interna 1,110 Re) a −7,7° (borda externa
  // 2,326 Re) — faixa de ~31 px no meridiano central, o px DECLARADO
  // do efeito julgado. E(real)=0,0106 a 9,710 UA.
  [
    'jupiter',
    '?pos=0.000014120014161765692,0.000018255528587957974,0.00000748112563397955'
      + '&look=0.000014127656995165159,0.000018260414310732658,0.000007483024335340463'
      + '&jd=2460409.26395835&corpos=1&shot=2',
  ],
  // jupiternb → cortada (113 i): o gate T-E10 fica com mercurionb/venusnb/titannb.
  [
    'saturno-anel',
    '?pos=0.0000444068440660703,-0.000013639700232235952,-0.000007543925357433521'
      + '&look=0.000044415067790719945,-0.000013646416397844129,-0.0000075488848424994925'
      + '&jd=2460409.26395835&corpos=1&shot=2',
  ],
  [
    'saturno-anelnb',
    '?pos=0.0000444068440660703,-0.000013639700232235952,-0.000007543925357433521'
      + '&look=0.000044415067790719945,-0.000013646416397844129,-0.0000075488848424994925'
      + '&jd=2460409.26395835&corpos=1&shot=2&nobloom=1',
  ],
  // ------------------------------------------------------------------
  // ONDA 6 (F5) — AS LUAS EM LOTE, no MESMO jd pinado da onda
  // (2024-04-08). Entram ANTES do código da fase (regra da Onda 4): a
  // baseline nasce no HEAD sem os meshes, e o "depois" vira oficial
  // (D11). Câmera a 4 raios do centro, 20° em torno do polo IAU pelo
  // lado ILUMINADO (o padrão da vista `lua`/`mercurio`: disco ~757 px
  // em 1800×1713). Números da MESMA cadeia do app (efemerides.bin →
  // eclipticaParaEquatorial → AU_PARA_PC).
  //
  // `titan`: atmosfera opaca a 9,705 UA — E(real)=0,0106. O par
  // &nobloom=1 é o GATE T-E10 das irmãs (Titã é o herói da bancada).
  [
    'titan',
    '?pos=0.000044401483620258156,-0.000013608337576815957,-0.00000755020595854049'
      + '&look=0.00004440174800605111,-0.000013608537105468783,-0.000007550247480449924'
      + '&jd=2460409.26395835&corpos=1&shot=2',
  ],
  [
    'titannb',
    '?pos=0.000044401483620258156,-0.000013608337576815957,-0.00000755020595854049'
      + '&look=0.00004440174800605111,-0.000013608537105468783,-0.000007550247480449924'
      + '&jd=2460409.26395835&corpos=1&shot=2&nobloom=1',
  ],
  // europa → cortada (113 i): a lei Lommel-Seeliger segue vigiada por lua/mercurio/vesta; titan cobre lua de gigante.
  // europanb → cortada (113 i): o gate T-E10 fica com mercurionb/venusnb/titannb.
  // ------------------------------------------------------------------
  // ONDA 6 (F6) — ANÕES/TNOs + ANÉIS, no MESMO jd pinado da onda
  // (2024-04-08). Entram ANTES do código da fase (regra da Onda 4): a
  // baseline nasce no HEAD sem os meshes, e o "depois" vira oficial
  // (D11). Números da MESMA cadeia do app (efemerides.bin →
  // eclipticaParaEquatorial → AU_PARA_PC).
  //
  // `plutao-caronte`: os DOIS em quadro. Look no ponto médio do par
  // (sep. 16,49 R_plutão, BODY999_RADII 1188,3 km / BODY901 606 km);
  // câmera a 22 R_plutão do médio, −20° em torno do polo IAU pelo
  // lado iluminado e +12° de elevação (sem a elevação o par alinha
  // quase na linha de visada). Discos declarados: Plutão ~183 px,
  // Caronte ~63 px; separação angular 35,4°. E(real)=0,00082 a
  // 34,99 UA. O par &nobloom=1 é o GATE T-E10 das irmãs.
  //
  // `quaoar-anel`: globo + anel Q1R (7,47 R, Pereira23). Câmera a
  // 22 R (R=543 km) do centro, −20° de azimute e +18° de elevação
  // (o padrão saturno-anel: o anel não pode ler de perfil). Polo
  // didático = norte eclíptico em equatorial (Quaoar sem IAU no
  // pck00011 — o anel da F6-2 mora neste plano). GLOBO ~154 px;
  // ANEL (eixo maior) ~1108 px — o px DECLARADO do efeito. E(real)
  // =0,00056 a 42,29 UA.
  [
    'plutao-caronte',
    '?pos=0.00008477711261100184,-0.00013105504237912263,-0.00006642962023154119'
      + '&look=0.00008477758817176725,-0.00013105552796989695,-0.00006643012602992766'
      + '&jd=2460409.26395835&corpos=1&shot=2',
  ],
  // plutao-carontenb → cortada (113 i): o gate T-E10 fica com mercurionb/venusnb/titannb.
  [
    'quaoar-anel',
    '?pos=0.00017125670258576192,0.00009621234849511725,0.000058818663740295546'
      + '&look=0.00017125697758965395,0.00009621246017136201,0.00005881891229886131'
      + '&jd=2460409.26395835&corpos=1&shot=2',
  ],
  // quaoar-anelnb → cortada (113 i): o gate T-E10 fica com mercurionb/venusnb/titannb.
  // ------------------------------------------------------------------
  // ONDA 6 (F7) — ASTEROIDES, no MESMO jd pinado da onda (2024-04-08).
  // Entram ANTES do código da fase (regra da Onda 4). Câmera a 4 raios
  // do centro (BODY2000004_RADII a=289 km), −20° em torno do polo IAU
  // pelo lado iluminado (o padrão lua/mercurio: disco ~829 px em
  // 1800×1713). Cadeia do app (efemerides.bin →
  // eclipticaParaEquatorial → AU_PARA_PC). E(real)=0,158 a 2,517 UA.
  [
    'vesta',
    '?pos=-0.000005058489376246491,0.000010073653329889095,0.000004679479055866578'
      + '&look=-0.000005058494464853001,0.000010073688779328954,0.000004679490053606362'
      + '&jd=2460409.26395835&corpos=1&shot=2',
  ],
  // vestanb → cortada (113 i): o gate T-E10 fica com mercurionb/venusnb/titannb.
  // ------------------------------------------------------------------
  // O MODO ATLAS, e ela fecha um BURACO DE COBERTURA que nenhuma outra
  // vista cobre: as outras 51 rodam em fase de FILME, e a fase `atlas` é
  // a única que decide enquadramento por conta própria (`casaViva` — a
  // órbita mais externa VIVA — em vez de um `?pos=` cravado). Sem ela,
  // mexer no rig do Atlas, na abertura ou na própria fase não moveria md5
  // nenhum.
  //
  // O QUE ELA GUARDAVA ANTES, e não guarda mais: a lei de moderação do
  // clarão do Atlas (`claraoDoAtlas`, com `PISO_DO_CLARAO` e a referência
  // de 20.000 UA). Ela MORREU no M1 — os dois modos desenham igual, e a
  // varredura invertida de `simbolosProibidos.test.ts` vigia a
  // ressurreição dos três símbolos. O que a vista compra hoje é a
  // abertura do Atlas: a 226,8 UA o Sol não chega a um pixel, então quem
  // move este md5 é o ENQUADRAMENTO e o céu, não a fotometria do Sol —
  // para o Sol do Atlas quem responde é a prova do degrau do corpo, no
  // `atlas-smoke`.
  //
  // `?atlas=1` e NÃO `?pos=`: a precedência declarada em App.tsx é
  // `?pos=` > `?atlas=1`, então cravar a câmera desligaria justamente o
  // modo que se quer exercer. O enquadramento vem da abertura do Atlas,
  // que é determinística.
  // `&jd=` pelo mesmo motivo das quatro de corpo acima: o instante da
  // efeméride é dado de imagem, e sem ele a Terra e a Lua entrariam no
  // quadro no retrato congelado — que é outro céu.
  ['atlas', '?atlas=1&jd=2460409.26395835&shot=2'],
  // ------------------------------------------------------------------
  // AS DUAS DO FOCO (item 83 · L1, 24/08) — e elas nasceram de um BURACO
  // MEDIDO, não de zelo: das 52 vistas acima, NENHUMA tem corpo em foco.
  // As de corpo (`terra`, `jupiter`, `titan`…) cravam a câmera com
  // `?pos=&look=`, que é voo livre — `focoCorpoId` fica `null` nas 52. Um
  // degrau que só muda a cena QUANDO há foco seria, para este gate,
  // invisível: as 52 sairiam bit-idênticas e o veredito "não mudou nada"
  // mediria a ausência de assunto, não o trabalho (AGENTS.md §7 — a
  // obrigação é criar a vista que cobre).
  //
  // `?foco=` ENTRA NO ATLAS SOZINHA (useDirector.ts) e enquadra pelo mesmo
  // caminho do clique num nome, então as duas exercem o par inteiro: a
  // Escada escreve o foco, a camada das órbitas o lê.
  //
  //  - `foco-jupiter` é o contraste HELIOCÊNTRICO, no enquadramento da
  //    órbita do próprio alvo: acendem CINCO linhas — as quatro de dentro
  //    mais a de Júpiter —, e de Saturno para fora a órbita já não cabe no
  //    quadro. É a vista em que UMA sobe e QUATRO recuam.
  //  - `foco-luas` é o contraste ENTRE FAMÍLIAS, que nenhuma outra vista
  //    tem: `?d=0.01` desce ao sistema de Júpiter e acende OITO linhas
  //    repartidas ao meio — as quatro galileanas (a família do alvo) e as
  //    quatro heliocêntricas de dentro (que não são dele). Medido no
  //    binário de 23/08, antes do L1: as oito a 0,32/0,30, sem hierarquia
  //    nenhuma. É a vista que cobra a segunda metade do L1 — "e as das
  //    LUAS dele" —, que a de cima não alcança.
  //
  // `&jd=` pelo motivo de sempre: sem efeméride viva esta camada não
  // desenha NADA (`orbitas.ts` §6), e uma vista de foco sem linha nenhuma
  // não guardaria o que se quer guardar.
  ['foco-jupiter', '?foco=jupiter&jd=2460409.26395835&shot=2'],
  ['foco-luas', '?foco=jupiter&d=0.01&jd=2460409.26395835&shot=2'],
  // ------------------------------------------------------------------
  // AS TRÊS DO POLO DA LUA ENQUADRADA (item 88, 25/08) — o mesmo buraco
  // medido do bloco de cima, uma camada abaixo: as duas de `foco-` são
  // do degrau ÓRBITA (Júpiter é planeta), e as de lua do lote da F5
  // (`titan`, `europa`) cravam a câmera com `?pos=&look=`, que é voo
  // livre. NENHUMA das 54 desce ao degrau `lua` pelo enquadramento do
  // app, e por isso o alto da tela de quem enquadra Titã podia ser o
  // eixo da NOSSA Lua sem nenhum gate piscar.
  //
  // `?foco=<lua>` cai em `Escada.focarNaLua` (para uma lua os dois
  // valores de `?ver=` dão o mesmo degrau), que é o gesto, e o primeiro
  // tique do relógio passa pelo religador (`enquadreVivo`) — os DOIS
  // escritores de câmera do degrau ficam sob a régua na mesma captura.
  //
  // As três são famílias diferentes E doses diferentes do mesmo efeito,
  // medidas contra o polo da Lua na época (sem os termos de nutação):
  //  - `foco-titan`   (Saturno)  28,1° — o caso canônico do item, e o
  //    que roda o horizonte o bastante para o olho ver sem régua.
  //  - `foco-caronte` (Plutão)  112,8° — o extremo: o polo de Caronte
  //    aponta quase para o lado oposto, e aqui a cena vira de cabeça.
  //  - `foco-io`      (Júpiter)   2,2° — a dose MÍNIMA da família das
  //    21, e é ela que impede o gate de virar teatro: se o conserto
  //    fosse só um caso especial de Saturno, esta sairia bit-idêntica.
  //
  // `&jd=` é o mesmo instante pinado das luas da F5 (2024-04-08): sem
  // efeméride viva não há posição de lua nenhuma (`focarNaLua` devolve
  // sem enquadrar), e a vista não guardaria nada.
  //
  // E O VALOR DE `?foco=` É O NOME pt-BR NORMALIZADO, não o id inglês da
  // camada — a porta carrega uma CONSULTA, resolvida pelo mesmo `buscar`
  // da caixa de busca (`buscaEstrelas.ts`). Custou uma leva descobrir:
  // `?foco=titan` casa por PREFIXO com "Titânia" e devolve a lua de
  // URANO, e `?foco=charon` não casa com nada (o alvo fica nulo e a
  // vista vira a abertura do Atlas). `tita` e `caronte` casam por degrau
  // EXATO; `io` também, e o exato ganha de qualquer prefixo.
  //
  // ⚠ `foco-titan` TREME SOZINHA, e o tremor NÃO é dela: é do anel de
  // Saturno, que a leva já carregava. Medido em 25/08, o mesmo lado
  // contra ele mesmo — `foco-titan` 651 px de 3.083.400 (0,021%, delta
  // máx 35), numa caixa de 211×88 sobre a linha do anel e a sombra dela
  // no globo; a `saturno-anel`, que está na lista desde a F6, dá 828 px
  // (0,027%, delta máx 47) pela mesma assinatura. A CÂMERA não treme:
  // `camera.up` e `camera.position` saíram bit a bit iguais em duas
  // navegações e depois do religador do relógio. Quem julgar esta vista
  // lê o diff de pixel, não o md5 sozinho — e a régua da mudança que ela
  // existe para medir é de outra ordem: 2,3 milhões de px, 74,9% do
  // quadro.
  ['foco-titan', '?foco=tita&jd=2460409.26395835&shot=2'],
  // foco-caronte → cortada (113 i): foco-titan (28,1°, o caso canônico) e foco-io (2,2°, a dose mínima) seguram o gate do polo.
  ['foco-io', '?foco=io&jd=2460409.26395835&shot=2'],
  // ------------------------------------------------------------------
  // AS TRÊS DOS HELIOCÊNTRICOS SEM PONTO (item 92, 25/08) — o mesmo
  // buraco medido dos dois blocos acima, na última família que faltava.
  // Das 57 vistas de cima, NENHUMA desce ao degrau `corpo` de um anão
  // ou de um asteroide: as de `foco-` são de órbita (Júpiter) ou de lua
  // (Titã, Caronte, Io), e nenhum dos oito tem vista própria. Por isso
  // a classe inteira podia devolver quadro SEM GLOBO — o `?ver=corpo`
  // do link era engolido em silêncio — sem nenhum gate piscar.
  //
  // AS DUAS PRIMEIRAS MUDAM DE PROPÓSITO, e é isso que elas compram: a
  // régua de identidade só serve para o que NÃO devia mudar, e uma
  // vista que se move é a prova de que o degrau passou a existir.
  // Medido pela URL: a câmera sai de 77.040.000 raios de Éris para 6,4
  // (o `?d=6` do endereço), e o globo de 0,00003 px para 399 px.
  //
  //  - `anao-eris-corpo`  é o caso do item: o mais DISTANTE que a
  //    escada tenta (93,5 UA), e o único em que a efeméride que chega
  //    tarde decide o degrau — os oito estão fora do `RETRATO_2026`.
  //  - `anao-vesta-corpo` é a outra FAMÍLIA (asteroide) e a outra
  //    ordem de distância (2,4 UA). Ela impede o gate de virar caso
  //    especial de Éris: um conserto escrito só para um corpo deixaria
  //    esta parada.
  //  - `anao-eris-orbita` é a ANTI-DERIVA do conserto dos ANÕES: no par
  //    daquele assunto ela sai bit-idêntica (`?foco=` sem `?ver=` é o
  //    degrau de órbita desde sempre, e um conserto que descesse por
  //    conta própria trocaria um defeito por outro). Mudança GLOBAL
  //    legítima de luz PODE tocá-la — em 30/08 o ponto fotométrico da
  //    Lua (item 108) somou 1 px nela, dentro do clarão do Sol. Sem ela
  //    o par de cima não distingue "o degrau de baixo passou a existir"
  //    de "o de cima morreu".
  //
  // `&jd=` é o mesmo instante das vistas de foco acima: sem efeméride
  // viva estes oito não têm posição NENHUMA (nem órbita, nem globo).
  ['anao-eris-corpo', '?foco=eris&ver=corpo&d=6&jd=2460409.26395835&shot=2'],
  ['anao-vesta-corpo', '?foco=vesta&ver=corpo&d=6&jd=2460409.26395835&shot=2'],
  ['anao-eris-orbita', '?foco=eris&jd=2460409.26395835&shot=2'],
  // O FIM DO FILME (item 108, 30/08) — o buraco que o próprio item furou: a
  // última vista oficial era `mergulho` em t=180 e o filme dura 193 s
  // (`cameraRig.test.ts`: `journey.duration === 193`), então os 13 segundos
  // finais — a chegada n'A TERRA, o ato que o dono viu quebrar — não tinham
  // juiz nenhum. t=193 e não t=190 porque é o quadro EXTREMO: pinar 190
  // deixaria os últimos 3 s de fora, e a queixa dele é sobre o fim, não sobre
  // a véspera dele. Escolhido por ESTABILIDADE, não por gosto — par nulo de
  // 3 capturas na mesma árvore, md5 igual nas três, para as duas candidatas
  // (`capturas/item108-fim-vista-parnulo.json`); o fim tem véu e coda, e vista
  // que treme no gate é pior que buraco.
  // NO FIM DA LISTA de propósito (auditoria de 30/08): o round-robin dos
  // baldes reparte por índice, e entrar no meio deslocava a leva inteira —
  // o balde maior ia a 10 capturas e a conta do custo virava mentira. A
  // regra continua de pé e é por ela que o TRIO DO ATLAS abaixo entrou
  // depois desta, e não ao lado das irmãs de `foco-`.
  ['fim-do-filme', '?t=193&shot=2'],
  // ------------------------------------------------------------------
  // AS TRÊS DO ATLAS (item 84, 31/08) — a POPULAÇÃO que faltava no modo
  // que virou o produto. O buraco foi medido sem querer em 23/08: uma
  // mudança que só tocava o Atlas devolveu 51 de 52 vistas bit-idênticas,
  // e não porque quase nada mudou — porque quase tudo naquela lista roda
  // por `?pos=`, isto é, na fase do VOO LIVRE. A única que se mexeu foi
  // `atlas` (8,08% do quadro). Os itens 83/88/92 trouxeram depois as de
  // `foco-`/`anao-`, e sobraram os TRÊS assuntos que o item 84 nomeia e
  // que nenhuma delas alcança: o enquadramento de um CORPO do retrato, o
  // TETO do zoom e o CLOSE-UP de uma lua.
  //
  // TODAS COM CORPOS NOVOS, de propósito: repetir Júpiter, Titã, Io,
  // Éris ou Vesta compraria uma segunda foto do mesmo caminho. E todas
  // com `&jd=` pelo motivo de sempre — sem efeméride pinada a pose anda
  // com o dia e o md5 deixa de ser régua.
  //
  //  - `atlas-corpo-marte` é o degrau `corpo` de um PLANETA DO RETRATO
  //    pelo caminho do Atlas. As duas de `?ver=corpo` que já existem
  //    (`anao-eris-corpo`, `anao-vesta-corpo`) são de `HELIO_SEM_PONTO`
  //    — outra lista, outro ramo —, e as de planeta resolvido (`terra`,
  //    `jupiter`, `mercurio`…) cravam a câmera com `?pos=`, que é voo
  //    livre. SEM `?d=`: o que esta guarda é o enquadramento PADRÃO do
  //    degrau, que ninguém pina — as duas irmãs o desligam com `&d=6`.
  //    Medido no nascimento: a câmera pousa a 3,7741 raios de Marte
  //    (12,9 mil km do centro), disco de ~830 px em 1800×1713, 24,5% do
  //    quadro aceso, com as órbitas de Fobos e Deimos cruzando o campo.
  //
  //  - `atlas-teto-netuno` é o TETO DO ZOOM, o mais longe a que o modo
  //    leva — e a única vista que exerce o GRAMPO de `pinarDistancia`
  //    (`AtlasRig`) e o termo `+ |alvo|` de `tetoDeZoom`, que é o que
  //    torna a esfera honesta para um alvo fora do centro. O `?d=100000`
  //    não é uma distância: é um pedido impossível que o grampo devolve
  //    NO TETO, e é assim que a vista NOMEIA o teto em vez de copiar um
  //    número que envelhece. Provado no nascimento: `d=100000`,
  //    `d=1000000` e `d=10000000` devolvem o MESMO md5 (4750e7bd5e37).
  //    Medido: 246,47 UA do alvo (8,24 raios da órbita de Netuno), 1,87×
  //    a distância em que a abertura pousa (132,06 UA) — o `atlas` NÃO a
  //    cobre, e a prova é que `?atlas=1&d=100000` (133,69 UA, o teto com
  //    o Sol no alvo) já difere dele.
  //
  //  - `atlas-lua-ganimedes` é o CLOSE-UP de lua, e é outra coisa que
  //    `foco-io`/`foco-titan`: aquelas pousam no enquadramento padrão do
  //    degrau `lua`, que guarda o PAI em quadro — nelas o quadro aceso é
  //    32,3% e 40,2%, e boa parte disso é o planeta atrás. Aqui o `?d=2`
  //    desce ao globo: 79,1% do quadro é Ganimedes (1.790 × 1.664 px),
  //    sem pai e sem céu que salve — é a única vista da casa em que a
  //    superfície de uma lua resolvida PELO ATLAS ocupa a tela. Medido:
  //    2,0000 raios exatos, o pino do link mandando.
  //
  // ESTABILIDADE ANTES DE PINAR, como o item 108 fez: par nulo de 3
  // capturas por candidata na MESMA árvore, md5 igual nas três
  // (`capturas/item84-vistas-atlas-parnulo.json`). Candidatas descartadas
  // por LEITURA, não por gosto: `?foco=miranda` e `?foco=tritao` devolvem
  // quadro quase todo escuro (a lua no lado da noite), e a família de
  // Saturno está fora por tremor conhecido (item 101).
  ['atlas-corpo-marte', '?foco=marte&ver=corpo&jd=2460409.26395835&shot=2'],
  ['atlas-teto-netuno', '?foco=netuno&d=100000&jd=2460409.26395835&shot=2'],
  ['atlas-lua-ganimedes', '?foco=ganimedes&d=2&jd=2460409.26395835&shot=2'],
];
// SENTINELA (`SMOKE=1`): as três que mais pegam regressão. `sol` é o disco
// solar inteiro (coroa, raias, proeminências, o ato mais olhado do filme);
// `soldisco` é o campo com a cessão de dominância ligada a 0,1 pc — foi ela
// que mudou quando `DOMINANCE_DEFAULT_ON` virou true; `hero8` é o hero de
// perto, a única vista em que billboard e ponto do catálogo dividem o mesmo
// lugar com 11,3 px de raio. E `ua150` desde a Onda 4: é a única sentinela
// DENTRO do domínio profundo (150 UA), com o sistema solar inteiro em quadro
// — sem ela, iterar na onda dos planetas seria iterar às cegas.
// SENTINELA É PARA ITERAR: o gate de fechamento continua sendo a leva
// COMPLETA das 54 — quatro vistas não cobrem o aspecto (retrato), nem a
// travessia, nem o mergulho, nem os regimes do farFade, nem o Atlas.
const SENTINELAS = ['sol', 'soldisco', 'hero8', 'ua150'];
const APP = process.env.APP_URL || APP_PADRAO;
// TIER FIXO, e ele não é preferência. Por dois períodos:
//
//  ATÉ 20/08 ele era DEFESA. Sem `?q=` o `autoQuality` do engine rebaixava
//  cinema→alta→performance sozinho assim que a média caía de 42 fps, e isso
//  trocava `nebulaSteps` 56→30 e o `pixelRatio` NO MEIO da espera — o gate
//  comparava duas imagens tiradas em qualidades diferentes e chamava a
//  diferença de regressão. Medido na época: o app assentava em `performance`
//  em toda captura, e o `nearCeiling` ainda podia reacelerar para `alta`.
//
//  DESDE A LETRA D DOS AJUSTES ele é DECLARAÇÃO. Nada troca de tier sem o
//  visitante ter escolhido Auto, e sem `?q=` o boot é cinema por constante
//  (`TIER_DE_PRODUTO`) — o pino passou a ser redundante com o padrão. Fica
//  de pé porque gate não vive de padrão alheio: o dia em que o produto
//  mudar de tier de fábrica, esta linha é o que impede a leva inteira de
//  descomparar com o histórico sem ninguém ter pedido.
export const PIN = '&q=cinema';
// EXTRA=&knob=1 anexa um parâmetro a TODAS as vistas — o A/B de um knob se faz
// com o mesmo binário dos dois lados, sem editar nada entre as capturas.
//
// É POR AQUI QUE SE PROVA NEUTRALIDADE ONDE O md5 É CEGO (Onda 4, régua 3;
// cobrado de novo no gate da F6 da Onda 5). Perto do Sol o clarão satura o
// quadro: `ua150` e `ua40` devolvem md5 IGUAIS com céus diferentes, e uma
// mudança escondida atrás do branco passaria batida. O par honesto é
//
//   EXTRA='&nobloom=1' node scripts/visual/ab-identidade.mjs antes|depois
//
// com o bloom desligado dos DOIS lados. Medido na F6 (6 vistas em que o Sol
// domina, 900×900): 6/6 bit-idênticas.
const EXTRA = process.env.EXTRA || '';
// ...e o estado de uma leva com EXTRA NÃO pisa no estado da leva oficial. Sem
// este sufixo, quem rodasse o A/B do knob apagaria a baseline dos 18 md5 e
// só descobriria na próxima leva de fechamento — ~25 min de GPU para
// recapturar.
// ...e a JANELA entra no sufixo pelo MESMO argumento, palavra por palavra:
// ela muda a imagem tanto quanto o EXTRA, e uma varredura ad hoc de aspecto
// que gravasse no estado da leva oficial apagaria a mesma baseline pelo mesmo
// preço. Era o defeito irmão, e ele tinha ficado de fora do conserto.
const CHAVE_DO_ESTADO = `${EXTRA}${process.env.JANELA || ''}`;
const SUFIXO = CHAVE_DO_ESTADO ? `-${CHAVE_DO_ESTADO.replace(/[^a-z0-9]+/gi, '')}` : '';
// JANELA=700x1800 muda o tamanho da captura. Existe porque os TRÊS harnesses do
// repo capturam em 1:1 (rodada 1800x1800, sky 1440x1440, este 1800x1800), e
// qualquer defeito que dependa do ASPECTO da tela é invisível para todos eles —
// o corte lateral de sprite é exatamente desse tipo.
// JANELA=LxA sobrescreve o tamanho de TODAS as vistas, para varredura ad hoc.
const ESTADO = resolve(tmpdir(), `ab-identidade-${LADO}${SUFIXO}.json`);

/**
 * O CARIMBO DO CÓDIGO que produziu um estado — desde o item 113 (F2), o hash
 * da ÁRVORE de conteúdo, não o commit.
 *
 * O DEFEITO QUE A TROCA FECHA: o carimbo antigo era `rev-parse HEAD` + estado
 * sujo, então um COMMIT que não muda byte nenhum da árvore de trabalho (é o
 * fim normal de toda rodada: o `depois` aprovado vira commit) trocava o
 * carimbo e o `antes` da rodada seguinte recapturava tudo — ~8 min de GPU por
 * rodada encadeada, comprando prova nenhuma.
 *
 * COMO: `git add -A` + `write-tree` num ÍNDICE DESCARTÁVEL, copiado do índice
 * real para herdar o stat-cache (sem a cópia o git releria a árvore inteira;
 * com ela, só re-hasheia o que está sujo). O resultado é o hash que o próprio
 * git daria a um commit deste conteúdo: mesma árvore ⇒ mesmo carimbo, esteja
 * ela suja, staged ou commitada. Efeito colateral declarado: os blobs dos
 * arquivos sujos entram em `.git/objects` — os mesmos que o próximo `git add`
 * real escreveria; o `gc` apaga os que nunca virarem commit. O índice REAL
 * não é tocado.
 *
 * POR QUE NÃO ENTRA NO `SUFIXO`, que seria o lugar óbvio: o sufixo é a chave
 * de PAREAMENTO. O `depois` procura o `antes` por `ab-identidade-antes${SUFIXO}
 * .json`, e os dois lados de um A/B honesto têm, por definição, códigos
 * DIFERENTES — carimbo no nome do arquivo faria o `depois` procurar um `antes`
 * que não existe. Então ele vai ao LADO, no precedente do arquivo de `via` dos
 * filhos, e governa duas coisas: se o estado gravado deste lado ainda vale
 * para retomar, e (só para o `antes`) se o estado do OUTRO lado pode semear.
 *
 * Sem git (tarball, clone raso sem `.git`) devolve `sem-git`, uma constante:
 * o carimbo nunca invalida nada e a retomada volta a ser a de antes —
 * cegueira declarada, não silenciosa.
 *
 * EXPORTADA porque o carimbo não é só de retomada: todo número que um juiz
 * grava em disco precisa dizer de QUE código ele saiu, senão dois JSON com
 * valores diferentes não têm como ser conciliados depois. `colar-da-fita.mjs`
 * o carimba nas medidas dele, e a definição continua sendo esta — uma só.
 */
export function carimboDoCodigo() {
  const git = (args, env) =>
    execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, env });
  try {
    const indiceReal = resolve(ROOT, git(['rev-parse', '--git-path', 'index']).trim());
    const indiceTmp = resolve(tmpdir(), `ab-carimbo-${process.pid}`);
    copyFileSync(indiceReal, indiceTmp);
    try {
      const env = { ...process.env, GIT_INDEX_FILE: indiceTmp };
      git(['add', '-A'], env);
      return 'arv-' + git(['write-tree'], env).trim().slice(0, 12);
    } finally {
      rmSync(indiceTmp, { force: true });
    }
  } catch {
    return 'sem-git';
  }
}
const CARIMBO = carimboDoCodigo();
const carimboDoLado = (lado) => resolve(tmpdir(), `ab-identidade-${lado}${SUFIXO}-codigo.txt`);
const lerCarimbo = (lado) =>
  existsSync(carimboDoLado(lado)) ? readFileSync(carimboDoLado(lado), 'utf8').trim() : null;
// o filho recebe a sua fatia por ambiente; a linha de comando continua sendo
// a de sempre (`lado [vista]`), para nada do ritual mudar
const FILHO = process.env.AB_FILHO ? Number(process.env.AB_FILHO) : null;
// 6 e não 3 por MEDIÇÃO, não opinião (mudança 5 do item 113, 30/08): a leva
// cheia deu 3,5 min a JOBS=6 contra 3,9 a JOBS=3, com a A/A bit-idêntica
// 50/50 nos dois — a GPU decidiu que aguenta seis sessões.
const JOBS = Math.max(1, Number(process.env.JOBS || 6));
const SMOKE = process.env.SMOKE === '1' || process.env.SMOKE === 'true';
// UMA SESSÃO POR BALDE, não um Chrome por captura (F3b do item 113): o
// boot+teardown do headless custava ~3 s × dezenas de capturas. O padrão é o
// já provado do `atlas-smoke` (91 navegações numa sessão) e do MB1: sessão
// viva, `ir()` navega documento NOVO por vista. O prefixo é ÚNICO por
// abertura, senão a reabertura de socorro reusaria o perfil — e leria o
// `DevToolsActivePort` VELHO dele.
let seqSessao = 0;
const abrirSessaoDoAb = (janela) =>
  abrirSessao({
    janela: janela || process.env.JANELA || '1800x1800',
    app: APP,
    prefixo: `ab-${LADO}-j${FILHO ?? 'p'}-${seqSessao++}`,
  });

async function capturarNaSessao(sessao, query, png) {
  // NAVEGAÇÃO LIMPA POR VISTA: o storage da origem zera antes de cada
  // navegação — nenhuma vista herda estado da anterior (as preferências do
  // app moram em localStorage). O cache de HTTP fica de propósito: acelera a
  // cartografia de ~6 MB e não desenha pixel.
  await sessao.send('Storage.clearDataForOrigin', {
    origin: APP,
    storageTypes: 'cookies,local_storage,indexeddb,websql,service_workers,cache_storage',
  });
  const assentou = await sessao.ir(query);
  // buffer EFETIVO, não a janela pedida: 700x1800 vira 684x1705 depois da
  // barra de rolagem e do chrome do headless, e é o buffer que decide o
  // aspecto que o shader vê
  const efetivo = await sessao.js(
    "(()=>{const c=document.querySelector('canvas');return c?c.width+'x'+c.height:'?'})()"
  );
  const shot = await sessao.send('Page.captureScreenshot', { format: 'png' });
  const buf = Buffer.from(shot.data, 'base64');
  // captura preta ou página de erro: um md5 estável de NADA passaria no teste
  if (buf.length < 40000) throw new Error(`captura suspeita de vazia (${buf.length} B)`);
  if (png) writeFileSync(png, buf);
  return {
    hash: createHash('md5').update(buf).digest('hex').slice(0, 12) + '@' + efetivo,
    via: assentou.via,
    ms: assentou.ms,
  };
}

/**
 * Captura uma lista de vistas em SÉRIE e grava o resultado em `arquivo` a
 * cada vista concluída. É o corpo do laço de sempre — o pai serial, cada
 * filho do paralelo e a re-mira de DIFERE chamam exatamente este.
 *
 * `base` é o que JÁ estava medido: no pai serial é o estado lido do disco,
 * e ele precisa ser reescrito junto a cada vista, senão uma queda no meio da
 * leva deixaria em disco só as vistas desta rodada — a retomada perderia
 * justamente as boas que já custaram GPU.
 *
 * A janela é da SESSÃO (o Chrome não redimensiona por vista), então a lista
 * se agrupa por janela e cada grupo vive numa sessão: na leva oficial são
 * duas — a das 1800×1800 e a da `retrato` (700×1800).
 *
 * `vezes` força o número de capturas (a re-mira usa ×2); `acumular` faz as
 * novas capturas se SOMAREM às da base em vez de recomeçar a vista — é o que
 * permite à re-mira classificar INSTÁVEL contra a 1ª captura. `ladoDoPng`
 * existe porque a re-mira do lado `antes` roda dentro da invocação `depois`,
 * e o PNG dela tem de se chamar `ab-antes-…` para o diff de pixel comparar
 * os pares certos.
 *
 * Devolve `{ out, vias }`: `vias` é uma entrada por CAPTURA (não por vista),
 * 'sinal' ou 'quadros', e é o que `julgarProntidao` julga no fim da leva.
 */
async function capturarLista(
  vistas, arquivo, marca = '', base = {},
  { vezes = null, acumular = false, ladoDoPng = LADO } = {}
) {
  const out = { ...base };
  const vias = [];
  const grupos = new Map();
  for (const v of vistas) {
    const chave = v[2] || process.env.JANELA || '1800x1800';
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(v);
  }
  for (const [janela, grupo] of grupos) {
    let sessao = await abrirSessaoDoAb(janela);
    try {
      for (const [nome, query] of grupo) {
        out[nome] = acumular ? [...(out[nome] || [])] : [];
        const daVista = [];
        const n = vezes ?? capturasDaVista(nome);
        for (let k = 0; k < n; k++) {
          // capturas/ é gitignored e não existe em clone novo — criar aqui,
          // senão a única forma de OLHAR a diferença (o diff de pixel) morre
          // no open()
          const png = SO ? resolve(ROOT, 'capturas', `ab-${ladoDoPng}-${nome}-${k}.png`) : null;
          if (png) mkdirSync(resolve(ROOT, 'capturas'), { recursive: true });
          // uma segunda chance por captura, agora trocando a SESSÃO inteira:
          // o Chrome headless morre no arranque (ou no meio do balde) de vez
          // em quando, e perder a bateria por isso é caro demais
          let r = null;
          for (let tent = 1; tent <= 2 && r === null; tent++) {
            try {
              r = await capturarNaSessao(sessao, (query + PIN + EXTRA).slice(1), png);
            } catch (e) {
              console.log(`${marca}  ${nome} ${k} tentativa ${tent} falhou: ${e.message}`);
              await sessao.fechar().catch(() => {});
              if (tent === 2) throw e;
              sessao = await abrirSessaoDoAb(janela);
            }
          }
          out[nome].push(r.hash);
          vias.push(r.via);
          daVista.push(`${r.via}/${(r.ms / 1000).toFixed(0)}s`);
        }
        console.log(`${marca}${nome.padEnd(10)} ${out[nome].join(' ')}  via=${daVista.join(' ')}`);
        // por VISTA, não no fim: o estado sobrevive a uma queda no meio
        writeFileSync(arquivo, JSON.stringify(out, null, 1));
      }
    } finally {
      await sessao.fechar().catch(() => {});
    }
  }
  writeFileSync(arquivo, JSON.stringify(out, null, 1));
  return { out, vias };
}

// O arquivo de `via` de cada filho, ao LADO do arquivo de md5 e não dentro
// dele: o de md5 tem o formato exato do estado de retomada (`{vista: [hash]}`)
// e o pai o funde com um `Object.assign` — enfiar metadado ali contaminaria a
// baseline que sobrevive entre sessões por uma economia de um arquivo.
const viasDoFilho = (k) => resolve(tmpdir(), `ab-identidade-${LADO}${SUFIXO}-j${k}-vias.json`);

/**
 * O VEREDITO da leva, puro — sem Chrome, sem disco, testado em
 * `ab-identidade.test.mjs`.
 *
 * A ARMADILHA QUE ELE FECHA: o laço antigo abria com
 * `if (!md5[nome] || !antes[nome]) continue;`. Uma vista ACRESCENTADA à lista
 * depois de capturar o "antes" não tinha baseline, caía no `continue` e sumia
 * — sem linha na tela e sem afetar o `>>> BIT-IDÊNTICO`, que saía verde tendo
 * julgado uma vista a menos. O mesmo `continue` engolia o espelho: uma vista
 * que o "depois" NÃO capturou (queda no meio da leva, estado de disco
 * incompleto) também passava batido. Gate que aprova o que não mediu é pior
 * que gate quebrado — a mesma lição do teto de segurança (`julgarProntidao`).
 *
 * A regra:
 * - sem "depois" → **AUSENTE**, e é ERRO: a comparação está incompleta e o
 *   veredito não vale. Recapture o lado que falta (o estado é retomável).
 * - com "depois" e sem "antes" → **NOVA**: não há o que comparar, a baseline
 *   dela nasce agora. Não é erro, mas TEM linha e entra no resumo — nunca
 *   silêncio.
 * - os dois lados presentes → `INSTÁVEL` (um dos lados não repetiu o próprio
 *   md5), `IGUAL` (interseção não vazia) ou `DIFERE`, como sempre.
 * - **nenhuma vista COMPARADA** (lista vazia, ou todas NOVA) → também ERRO.
 *   Não há veredito a dar sobre comparação nenhuma, e o verde de antes —
 *   ">>> BIT-IDÊNTICO (0 vistas julgadas)", saída 0 — era o mesmo defeito com
 *   outra roupa.
 *
 * `vistas` é a lista de NOMES que ESTA invocação cobre (a leva completa, ou o
 * recorte de `SMOKE`/vista única) — julgar sempre as 18 faria `SMOKE=1 depois`
 * reprovar por AUSENTE as 14 que ninguém pediu. `antes` e `depois` são os
 * mapas `{vista: [hash, ...]}` dos dois lados.
 */
export function julgarVistas({ vistas = [], antes = {}, depois = {} }) {
  const linhas = [];
  const conta = { IGUAL: 0, DIFERE: 0, INSTÁVEL: 0, NOVA: 0, AUSENTE: 0 };
  for (const nome of vistas) {
    const a = antes[nome]?.length ? [...new Set(antes[nome])] : null;
    const d = depois[nome]?.length ? [...new Set(depois[nome])] : null;
    let veredito;
    if (!d) veredito = 'AUSENTE';
    else if (!a) veredito = 'NOVA';
    else if (a.length > 1 || d.length > 1) veredito = 'INSTÁVEL';
    else veredito = a.some((h) => d.includes(h)) ? 'IGUAL' : 'DIFERE';
    conta[veredito]++;
    linhas.push({
      nome,
      veredito,
      antes: a,
      depois: d,
      texto: `${veredito.padEnd(9)} ${nome.padEnd(10)} `
        + `antes=${a ? a.join(',') : '—'} depois=${d ? d.join(',') : '—'}`,
    });
  }
  const julgadas = conta.IGUAL + conta.DIFERE + conta.INSTÁVEL;
  // ZERO VISTAS JULGADAS NÃO É VEREDITO — e era, até 2026-08-21:
  // `julgarVistas({vistas: []})` devolvia `bitIdentico: true`, imprimia
  // ">>> BIT-IDÊNTICO (0 vistas julgadas)" e saía 0. Verde de comparação
  // nenhuma é a mesma família do `continue` silencioso que este juiz nasceu
  // para fechar: gate que aprova o que não mediu. Vale para a lista vazia e
  // para a lista em que TODAS são NOVA (nenhuma tem baseline): em nenhum dos
  // dois houve comparação, e "bit-idêntico" seria mentira.
  const erro = conta.AUSENTE > 0 || julgadas === 0;
  const bitIdentico = !erro && conta.DIFERE === 0 && conta.INSTÁVEL === 0;
  const sufixo = conta.NOVA ? ` · ${conta.NOVA} NOVA(s) sem baseline (nada a comparar)` : '';
  let resumo;
  if (conta.AUSENTE > 0) {
    resumo = `>>> VEREDITO INVÁLIDO — ${conta.AUSENTE} vista(s) AUSENTE(s) no `
      + '"depois": recapture o lado que falta antes de concluir qualquer coisa'
      + sufixo;
  } else if (julgadas === 0) {
    resumo = '>>> VEREDITO INVÁLIDO — 0 vistas julgadas: nada foi comparado, '
      + 'e comparação nenhuma não é prova de igualdade'
      + sufixo;
  } else if (bitIdentico) {
    const n = julgadas === 1 ? '1 vista julgada' : `${julgadas} vistas julgadas`;
    resumo = `>>> BIT-IDÊNTICO (${n})${sufixo}`;
  } else {
    resumo = '>>> NÃO é bit-idêntico — rodar o diff de pixel antes de concluir'
      + sufixo;
  }
  return { linhas, conta, julgadas, bitIdentico, erro, resumo };
}

// ---- FILHO: uma fatia da lista, um Chrome de cada vez, arquivo próprio ----
async function filho() {
  const nomes = new Set((process.env.AB_VISTAS || '').split(',').filter(Boolean));
  const { vias } = await capturarLista(
    VISTAS.filter(([n]) => nomes.has(n)),
    resolve(tmpdir(), `ab-identidade-${LADO}${SUFIXO}-j${FILHO}.json`),
    `[j${FILHO}] `
  );
  // o filho NÃO julga: quem vê a leva inteira é o pai, e "todas caíram no
  // fallback" só tem sentido somando os três baldes
  writeFileSync(viasDoFilho(FILHO), JSON.stringify(vias));
  process.exit(0);
}

// ---- PAI ----------------------------------------------------------------
async function pai() {
  const ping = await fetch(APP).then((r) => r.text()).catch(() => '');
  if (!ping.includes('<div id="root"')) throw new Error(`dev server não respondeu em ${APP}`);

  // RETOMA o que já está em disco em vez de começar do zero. Uma bateria são
  // minutos de GPU, e antes disto uma captura travada no meio jogava fora TODAS
  // as vistas já medidas — inclusive as boas. Com o estado gravado por vista,
  // re-rodar o mesmo lado só refaz o que falta, e `ab-identidade.mjs antes
  // edgeon` deixa de apagar as outras (o filtro `SO` escrevia um estado
  // com uma vista só).
  //
  // ...MAS SÓ DENTRO DO MESMO CÓDIGO. Até 2026-08-21 a única invalidação era
  // `DOZERO=1`, à mão: quem editasse e rodasse `depois` recebia a leva inteira
  // em `(de disco)` — os md5 do binário ANTERIOR, apresentados como veredito da
  // mudança. O carimbo fecha isso sozinho.
  const carimboEmDisco = lerCarimbo(LADO);
  const outroCodigo = existsSync(ESTADO) && carimboEmDisco !== CARIMBO;
  if (outroCodigo && !process.env.DOZERO) {
    console.log(
      `estado de "${LADO}" é de outro código (${carimboEmDisco ?? 'sem carimbo'}), `
      + `agora em ${CARIMBO} — descartado`
    );
  }
  let md5 = existsSync(ESTADO) && !outroCodigo && !process.env.DOZERO
    ? JSON.parse(readFileSync(ESTADO, 'utf8'))
    : {};
  // A SEMENTE CRUZADA (F2 do item 113): o lado `antes` pode nascer do último
  // estado de QUALQUER lado cujo carimbo de ÁRVORE seja o atual — o caso vivo
  // é a rodada encadeada: o `depois` aprovado vira commit, o conteúdo não
  // muda, e o `antes` da rodada seguinte já está medido, só que no arquivo do
  // outro lado. Só o `antes` semeia: o `depois` é a prova da mudança, e
  // semeá-lo do `antes` transformaria o A/B em comparar um arquivo com a
  // cópia dele.
  if (LADO === 'antes' && !Object.keys(md5).length && !process.env.DOZERO) {
    const arqOutro = resolve(tmpdir(), `ab-identidade-depois${SUFIXO}.json`);
    if (existsSync(arqOutro) && lerCarimbo('depois') === CARIMBO) {
      md5 = JSON.parse(readFileSync(arqOutro, 'utf8'));
      console.log(
        `lado "antes" semeado do estado do lado "depois" (carimbo de árvore igual: ${CARIMBO})`
      );
    }
  }
  // O CARIMBO E O ESTADO ANDAM JUNTOS, e são gravados ANTES da primeira
  // captura: uma leva interrompida tem de deixar em disco um par coerente —
  // estado parcial com o código que o produziu. Gravar o carimbo no fim
  // deixaria a janela em que um estado descartado ainda está no disco com o
  // carimbo velho, e a próxima leva o retomaria como se valesse.
  writeFileSync(ESTADO, JSON.stringify(md5, null, 1));
  writeFileSync(carimboDoLado(LADO), CARIMBO);

  const lista = VISTAS.filter(([nome]) => {
    if (SO) return nome === SO;
    if (SMOKE && !SENTINELAS.includes(nome)) return false;
    return true;
  });
  const pendentes = lista.filter(([nome]) => {
    // `>=` e não `===`: uma vista que passou pela re-mira tem MAIS capturas
    // que o piso adaptativo dela, e isso é informação, não pendência
    if ((md5[nome]?.length ?? 0) >= capturasDaVista(nome) && !SO) {
      console.log(`${nome.padEnd(10)} ${md5[nome].join(' ')}  (de disco)`);
      return false;
    }
    return true;
  });

  const t0 = Date.now();
  const jobs = Math.min(JOBS, pendentes.length);
  // uma entrada por CAPTURA desta invocação, dos dois ramos. Vista que veio de
  // disco não entra: ela não capturou nada agora, e julgar o que não se mediu
  // seria inventar sinal.
  const vias = [];
  if (jobs <= 1) {
    // SERIAL, em processo — o caminho de sempre, e o que isola a prova do
    // sinal de prontidão da prova do paralelismo
    const serial = await capturarLista(pendentes, ESTADO, '', md5);
    Object.assign(md5, serial.out);
    vias.push(...serial.vias);
    writeFileSync(ESTADO, JSON.stringify(md5, null, 1));
  } else {
    // DIVISÃO DA LISTA em N processos independentes, cada um com o seu Chrome.
    // Round-robin e não blocos contíguos: as vistas custam tempos diferentes
    // (as de `?pos=` assentam antes das de `?t=`), e alternar reparte melhor.
    const baldes = Array.from({ length: jobs }, () => []);
    pendentes.forEach((v, i) => baldes[i % jobs].push(v));
    console.log(
      `${pendentes.length} vistas em ${jobs} processos: `
      + baldes.map((b, i) => `j${i}=${b.length}`).join(' ')
    );
    const filhos = baldes.map((balde, k) => new Promise((res, rej) => {
      const p = spawn(process.execPath, [fileURLToPath(import.meta.url), LADO], {
        env: {
          ...process.env,
          AB_FILHO: String(k),
          AB_VISTAS: balde.map(([n]) => n).join(','),
        },
        stdio: ['ignore', 'inherit', 'inherit'],
      });
      p.on('exit', (code) => (code === 0 ? res() : rej(new Error(`filho j${k} saiu com ${code}`))));
      p.on('error', rej);
    }));
    // `allSettled` e não `all`: um filho que cai não pode fazer o pai abandonar
    // os arquivos dos outros — o que já foi medido tem de entrar no estado, ou
    // a retomada em disco não vale nada.
    const fim = await Promise.allSettled(filhos);
    for (let k = 0; k < jobs; k++) {
      const arq = resolve(tmpdir(), `ab-identidade-${LADO}${SUFIXO}-j${k}.json`);
      if (existsSync(viasDoFilho(k))) {
        vias.push(...JSON.parse(readFileSync(viasDoFilho(k), 'utf8')));
        rmSync(viasDoFilho(k), { force: true });
      }
      if (!existsSync(arq)) continue;
      Object.assign(md5, JSON.parse(readFileSync(arq, 'utf8')));
      rmSync(arq, { force: true });
    }
    writeFileSync(ESTADO, JSON.stringify(md5, null, 1));
    const caiu = fim.filter((f) => f.status === 'rejected');
    if (caiu.length) throw new Error(caiu.map((f) => f.reason.message).join('; '));
  }
  if (pendentes.length) {
    console.log(
      `\n${pendentes.length} vistas (${vias.length} capturas) em `
      + `${((Date.now() - t0) / 60000).toFixed(1)} min (JOBS=${jobs}${SMOKE ? ', SMOKE' : ''})`
    );
  }

  let vereditoInvalido = false;
  if (LADO === 'depois') {
    const arqAntes = resolve(tmpdir(), `ab-identidade-antes${SUFIXO}.json`);
    const antes = JSON.parse(readFileSync(arqAntes, 'utf8'));
    // OS DOIS CARIMBOS na tela, e é a razão de eles existirem: quem lê o
    // veredito passa a ver COM QUAL CÓDIGO cada lado foi medido, em vez de
    // deduzir do ritual. Carimbos iguais não são erro — o A/B de um knob por
    // `EXTRA=` se faz de propósito com o mesmo binário dos dois lados.
    console.log(`\ncódigo  antes=${lerCarimbo('antes') ?? '—'}  depois=${CARIMBO}`);
    // `lista` e não `VISTAS`: o veredito cobra o que ESTA invocação pediu.
    // Com a leva completa são as 18; com SMOKE/vista única é o recorte, e
    // cobrar as outras como AUSENTE reprovaria o fluxo de iterar.
    const nomes = lista.map(([nome]) => nome);
    let juizo = julgarVistas({ vistas: nomes, antes, depois: md5 });
    // A RE-MIRA (F3a do item 113): com captura única, DIFERE ainda não separa
    // regressão de captura não assentada — a 2ª captura que fazia isso virou
    // sob demanda. Quem DIFERE volta ×2 nos dois lados ANTES do veredito
    // final; as pinadas ficam de fora (já são ×2, o tremor delas é conhecido)
    // e vista que já tem ×2 dos dois lados também (o DIFERE dela é maduro).
    const suspeitas = juizo.linhas
      .filter((l) => l.veredito === 'DIFERE' && !PINADAS_N2.includes(l.nome))
      .filter((l) => (md5[l.nome]?.length ?? 0) < 2 || (antes[l.nome]?.length ?? 0) < 2)
      .map((l) => l.nome);
    if (suspeitas.length) {
      console.log(
        `\nre-mira: ${suspeitas.length} vista(s) DIFEREM na captura única — `
        + `recapturando ×2 antes do veredito: ${suspeitas.join(' ')}`
      );
      const vistasRe = lista.filter(([nome]) => suspeitas.includes(nome));
      const reD = await capturarLista(vistasRe, ESTADO, '[re] ', md5, {
        vezes: 2, acumular: true,
      });
      Object.assign(md5, reD.out);
      vias.push(...reD.vias);
      // o lado `antes` só se recaptura quando ele é do MESMO código (A/A,
      // knob por EXTRA): num A/B de verdade o binário dele já não existe, e
      // recapturá-lo com o código novo envenenaria a baseline
      if (lerCarimbo('antes') === CARIMBO) {
        const reA = await capturarLista(vistasRe, arqAntes, '[re-antes] ', antes, {
          vezes: 2, acumular: true, ladoDoPng: 'antes',
        });
        Object.assign(antes, reA.out);
        vias.push(...reA.vias);
      } else {
        console.log(
          'o lado "antes" é de outro código — re-mira só no "depois"; '
          + 'a captura única do "antes" fica'
        );
      }
      juizo = julgarVistas({ vistas: nomes, antes, depois: md5 });
    }
    for (const l of juizo.linhas) console.log(l.texto);
    console.log('\n' + juizo.resumo);
    vereditoInvalido = juizo.erro;
  }

  // POR ÚLTIMO, depois do veredito: o gate GRITA e SAI ≠ 0 se o sinal de
  // prontidão não subiu no dev server. Os md5 já estão em disco e na tela — o
  // que a saída ≠ 0 diz é "não valide nada com isto", no mesmo protocolo do
  // apaga-o-PNG-antes/exige-status-0-depois. Sem esta linha, uma quebra futura
  // do sinal voltaria a leva para os ~45 min e passaria por hardware lento.
  const prontidao = julgarProntidao({
    vias, appUrl: process.env.APP_URL, fallbackOk: process.env.FALLBACK_OK === '1',
  });
  if (prontidao.mensagem) process.stderr.write(prontidao.mensagem);
  // veredito INVÁLIDO sai ≠ 0 pelo mesmo motivo: um juízo que não julgou a
  // lista inteira — ou que não julgou NADA — não é veredito, e o silêncio de
  // antes era o defeito
  if (prontidao.erro || vereditoInvalido) process.exit(1);
}

// SÓ A INVOCAÇÃO POR LINHA DE COMANDO roda a leva. `ab-identidade.test.mjs`
// importa `julgarVistas` — puro, sem Chrome e sem disco — e um import não
// pode subir 30 capturas nem pingar o dev server.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (FILHO !== null) await filho();
  else await pai();
}
