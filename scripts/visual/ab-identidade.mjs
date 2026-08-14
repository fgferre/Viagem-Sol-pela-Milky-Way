// Prova de que uma mudança NÃO mexeu na imagem: md5 das mesmas vistas antes
// e depois.
//
//   node scripts/visual/ab-identidade.mjs antes      # no HEAD, antes de editar
//   ...edita...
//   node scripts/visual/ab-identidade.mjs depois     # compara e dá o veredito
//   node scripts/visual/ab-identidade.mjs antes interno   # uma vista só
//   SMOKE=1 node scripts/visual/ab-identidade.mjs antes   # 4 vistas-sentinela
//   JOBS=1 node scripts/visual/ab-identidade.mjs antes    # serial (padrão: 3)
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
//   10, 30, 80, 320 e 700 o hash é o mesmo. O método NÃO afrouxou: N=2 por
//   vista, navegador limpo por captura, tier pinado, md5 bit-exato.
//   O critério antigo continua vivo como TETO DE SEGURANÇA: se o sinal não
//   existir (bundle de produção — `window.__director` só é publicado em DEV)
//   ou não subir, a captura cai nos 700 quadros em vez de travar. A coluna
//   `via=` de cada linha diz por qual caminho ela assentou; uma leva inteira
//   em `via=quadros` é sinal quebrado, não lentidão de hardware — e desde
//   2026-08-11 isso não é só um aviso no rodapé: no alvo padrão, QUALQUER
//   captura por `quadros` faz o gate imprimir o bloco de erro e SAIR ≠ 0
//   (`julgarProntidao` em chrome.mjs). `FALLBACK_OK=1` aceita de propósito.
//
// PARALELISMO POR DIVISÃO DA LISTA (`JOBS=N`, padrão 3): o pai reparte as
// vistas entre N processos-filhos independentes, cada um com o SEU Chrome e o
// SEU perfil; o dev server é um só (serve estático, aguenta). Nunca N abas ou
// contextos num Chrome só — a bit-exatidão sob GPU compartilhada não está
// documentada em lugar nenhum, e o gate inteiro depende dela. Cada filho grava
// o seu arquivo de estado e o pai funde no JSON de sempre, no formato exato de
// antes. `JOBS=1` roda tudo em processo, em série — é assim que se isola a
// prova do sinal da prova do paralelismo.
//
// LEIA O VEREDITO CERTO: md5 igual prova igualdade; md5 diferente NÃO prova
// diferença — pode ser captura não assentada. Por isso N capturas por lado e
// a marca INSTÁVEL quando um dos lados não repete. E "DIFERE" pede o passo
// seguinte, não a conclusão: rodar o diff de pixel. Diferença de 1 nível
// espalhada por dezenas de pixels é 1 ULP do compilador (reordenar aritmética
// ao mudar um `if` já basta), não conteúdo que sumiu.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  CHROME, GPU_FLAGS, matarPerfil, portaDoPerfil, esperarAssentar, julgarProntidao, APP_PADRAO,
} from './chrome.mjs';

const LADO = process.argv[2] || 'antes';
const SO = process.argv[3];
const N = 2;
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
  ['edgeon', '?t=261&shot=2'],
  ['faceon', '?t=293&shot=2'],
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
  ['solrampa', '?pos=0,0,0.25&look=0,0,0&shot=2'],
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
  ['solreal1ua', '?pos=0,0,0.0000048481&look=0,0,0&shot=2'],
  ['solreal40ua', '?pos=0,0,0.00019393&look=0,0,0&shot=2'],
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
  ['hero600', '?pos=15.7242,746.2254,97.0322&look=3.1895,151.3642,19.682&shot=2'],
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
  // O par &nobloom=1 é GATE (emenda T-E10): é nele que se lê o subsolar
  // sem o clarão, contra o limiar 0,82 do bloom.
  [
    'terra',
    '?pos=-0.0000045882235587153385,-0.0000014555632225072523,-6.307425015010789e-7'
      + '&look=-0.0000045890070378484725,-0.000001455314175436054,-6.308304960541221e-7'
      + '&jd=2460409.26395835&corpos=1&shot=2',
  ],
  [
    'terranb',
    '?pos=-0.0000045882235587153385,-0.0000014555632225072523,-6.307425015010789e-7'
      + '&look=-0.0000045890070378484725,-0.000001455314175436054,-6.308304960541221e-7'
      + '&jd=2460409.26395835&corpos=1&shot=2&nobloom=1',
  ],
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
  // disco ~757 px em 1800×1713). E(real)=0,0399 a 5,006 UA. O par
  // &nobloom=1 é o mesmo GATE T-E10 das irmãs.
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
  [
    'jupiternb',
    '?pos=0.000014120014161765692,0.000018255528587957974,0.00000748112563397955'
      + '&look=0.000014127656995165159,0.000018260414310732658,0.000007483024335340463'
      + '&jd=2460409.26395835&corpos=1&shot=2&nobloom=1',
  ],
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
  //
  // `europa`: regolito LS (C=4/3 importado da Lua) a 5,002 UA —
  // E(real)=0,0400. O px do efeito julgado: o disco INTEIRO, 757 px.
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
  [
    'europa',
    '?pos=0.000014125408023292846,0.000018240877731646644,0.000007473746885565305'
      + '&look=0.00001412557512784177,0.00001824098426963711,0.0000074737888016236406'
      + '&jd=2460409.26395835&corpos=1&shot=2',
  ],
  [
    'europanb',
    '?pos=0.000014125408023292846,0.000018240877731646644,0.000007473746885565305'
      + '&look=0.00001412557512784177,0.00001824098426963711,0.0000074737888016236406'
      + '&jd=2460409.26395835&corpos=1&shot=2&nobloom=1',
  ],
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
  [
    'plutao-carontenb',
    '?pos=0.00008477711261100184,-0.00013105504237912263,-0.00006642962023154119'
      + '&look=0.00008477758817176725,-0.00013105552796989695,-0.00006643012602992766'
      + '&jd=2460409.26395835&corpos=1&shot=2&nobloom=1',
  ],
  [
    'quaoar-anel',
    '?pos=0.00017125670258576192,0.00009621234849511725,0.000058818663740295546'
      + '&look=0.00017125697758965395,0.00009621246017136201,0.00005881891229886131'
      + '&jd=2460409.26395835&corpos=1&shot=2',
  ],
  [
    'quaoar-anelnb',
    '?pos=0.00017125670258576192,0.00009621234849511725,0.000058818663740295546'
      + '&look=0.00017125697758965395,0.00009621246017136201,0.00005881891229886131'
      + '&jd=2460409.26395835&corpos=1&shot=2&nobloom=1',
  ],
  // ------------------------------------------------------------------
  // ONDA 6 (F7) — ASTEROIDES, no MESMO jd pinado da onda (2024-04-08).
  // Entram ANTES do código da fase (regra da Onda 4). Câmera a 4 raios
  // do centro (BODY2000004_RADII a=289 km), −20° em torno do polo IAU
  // pelo lado iluminado (o padrão lua/mercurio: disco ~829 px em
  // 1800×1713). Cadeia do app (efemerides.bin →
  // eclipticaParaEquatorial → AU_PARA_PC). E(real)=0,158 a 2,517 UA.
  // O par &nobloom=1 é o GATE T-E10 das irmãs.
  [
    'vesta',
    '?pos=-0.000005058489376246491,0.000010073653329889095,0.000004679479055866578'
      + '&look=-0.000005058494464853001,0.000010073688779328954,0.000004679490053606362'
      + '&jd=2460409.26395835&corpos=1&shot=2',
  ],
  [
    'vestanb',
    '?pos=-0.000005058489376246491,0.000010073653329889095,0.000004679479055866578'
      + '&look=-0.000005058494464853001,0.000010073688779328954,0.000004679490053606362'
      + '&jd=2460409.26395835&corpos=1&shot=2&nobloom=1',
  ],
  // ------------------------------------------------------------------
  // O MODO ATLAS, e ela fecha um BURACO DE COBERTURA de três ondas:
  // nenhuma das 22 vistas oficiais ligava `?atlas=1`, então a LEI DO
  // CLARÃO do Atlas (`claraoDoAtlas`, src/three/atlasConfig.ts) — a
  // única defesa que a casa construiu contra a tela branca de dentro do
  // sistema solar — nunca foi exercida por juiz nenhum. Ela é código de
  // runtime que só roda na fase 'atlas' (o tick não a chama fora dela),
  // e portanto invisível para as 22, todas em fase de filme.
  //
  // O QUE ESTA VISTA GUARDA: a moderação MÁXIMA da lei. Na abertura
  // (227 UA) o fator está no PISO — k = 227/20.000 dá k² = 1,29e-4, bem
  // abaixo de `PISO_DO_CLARAO` = 0,01 —, então é aqui que a defesa está
  // apertada ao limite. Mexer no piso, na referência de 20.000 UA ou na
  // lei quadrática move este md5 na hora, e é isso que a vista compra.
  //
  // E O QUE ELA MOSTRA, dito sem maquiagem porque foi a PRIMEIRA vez que
  // alguém olhou: mesmo no piso, o clarão do Sol-ponto ainda é uma bola
  // branca que ocupa a maior parte do quadro. A lei modera; ela não
  // resolve. É a MESMA pendência que o bastão já declarava por escrito
  // (item 3 das pendências — a tela branca é defeito de
  // EXPOSIÇÃO, e a causa medida é uma das cinco escalas de borrão do
  // clarão, não a lei do Atlas), agora com imagem, juiz e md5. Esta
  // vista é a linha de base contra a qual a onda da exposição vai poder
  // provar que consertou alguma coisa — hoje não há como provar.
  //
  // `?atlas=1` e NÃO `?pos=`: a precedência declarada em App.tsx é
  // `?pos=` > `?atlas=1`, então cravar a câmera desligaria justamente o
  // modo que se quer exercer. O enquadramento vem da abertura do Atlas,
  // que é determinística.
  // `&jd=` pelo mesmo motivo das quatro de corpo acima: o instante da
  // efeméride é dado de imagem, e sem ele a Terra e a Lua entrariam no
  // quadro no retrato congelado — que é outro céu.
  ['atlas', '?atlas=1&jd=2460409.26395835&shot=2'],
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
// COMPLETA das 18 — quatro vistas não cobrem o aspecto (retrato), nem a
// travessia, nem o mergulho, nem os regimes do farFade.
const SENTINELAS = ['sol', 'soldisco', 'hero8', 'ua150'];
const APP = process.env.APP_URL || APP_PADRAO;
// TIER FIXO, e ele não é preferência: sem `?q=` o `autoQuality` do engine
// rebaixa cinema→alta→performance sozinho assim que a média cai de 42 fps
// (engine.ts), e isso troca `nebulaSteps` 56→30 e o `pixelRatio` NO MEIO da
// espera. Numa máquina que segura 60 fps o degrau nunca dispara e `q=cinema`
// é BIT-EXATO (mesmo tier, mesmo preset — só desliga o automático); numa que
// não segura, sem ele o gate compara duas imagens tiradas em qualidades
// diferentes e chama a diferença de regressão. Medido aqui: o app assenta em
// `performance` (raymarch de 30 passos) em toda captura, e o `nearCeiling`
// do engine ainda pode reacelerar para `alta`.
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
// o filho recebe a sua fatia por ambiente; a linha de comando continua sendo
// a de sempre (`lado [vista]`), para nada do ritual mudar
const FILHO = process.env.AB_FILHO ? Number(process.env.AB_FILHO) : null;
const JOBS = Math.max(1, Number(process.env.JOBS || 3));
const SMOKE = process.env.SMOKE === '1' || process.env.SMOKE === 'true';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let id = 0;
function rpc(ws, onEvent) {
  const waiting = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); }
    else if (m.method) onEvent(m);
  });
  return (method, params = {}) => new Promise((res, rej) => {
    const n = ++id;
    waiting.set(n, (m) => (m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result)));
    ws.send(JSON.stringify({ id: n, method, params }));
  });
}

let seqPerfil = 0;
async function capturar(query, png, janela) {
  const [jw, jh] = (janela || process.env.JANELA || '1800x1800').split('x');
  let efetivo = '?';
  const perfil = resolve(tmpdir(), `ab-${process.pid}-${seqPerfil++}`);
  // PORTA ZERO: quem escolhe é o SO, e o Chrome publica a escolha no
  // DevToolsActivePort do próprio perfil. Com N filhos em paralelo (e duas
  // levas simultâneas na mesma máquina) não sobra aritmética de porta para
  // errar — era a única corrida de verdade do paralelismo por lista.
  const chrome = spawn(CHROME, [
    ...GPU_FLAGS,
    '--hide-scrollbars', '--no-first-run', '--mute-audio',
    '--force-device-scale-factor=1', `--window-size=${jw},${jh}`,
    `--user-data-dir=${perfil}`, '--remote-debugging-port=0', 'about:blank',
  ], { stdio: 'ignore' });
  try {
    const porta = await portaDoPerfil(perfil);
    let url = null;
    for (let i = 0; i < 100 && !url; i++) {
      try {
        const r = await fetch(`http://127.0.0.1:${porta}/json/list`).then((x) => x.json());
        url = r.find((t) => t.type === 'page')?.webSocketDebuggerUrl;
      } catch { /* Chrome ainda subindo */ }
      if (!url) await sleep(200);
    }
    if (!url) throw new Error('CDP não respondeu');
    const ws = new WebSocket(url);
    // COM TIMEOUT, e ele já custou uma bateria inteira: se o alvo do CDP morre
    // entre o /json/list e o handshake, nem `open` nem `error` disparam. A
    // promessa fica pendente para sempre, o Node fica sem handles, e o processo
    // SAI com um aviso de "unsettled top-level await" — três vistas capturadas,
    // nenhuma gravada, e um veredito que nunca vem.
    await new Promise((r, j) => {
      const relogio = setTimeout(() => j(new Error('WebSocket do CDP não abriu em 30 s')), 30000);
      ws.addEventListener('open', () => { clearTimeout(relogio); r(); });
      ws.addEventListener('error', (e) => { clearTimeout(relogio); j(new Error('WebSocket: ' + e.message)); });
    });
    let cartografiaChegou = false;
    const send = rpc(ws, (m) => {
      if (m.method === 'Runtime.consoleAPICalled') {
        const txt = (m.params.args || []).map((a) => String(a.value ?? '')).join(' ');
        if (txt.includes('[cartografia]')) cartografiaChegou = true;
      }
    });
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: 'window.__f=0;const o=window.requestAnimationFrame.bind(window);'
        + 'window.requestAnimationFrame=(c)=>o((t)=>{window.__f++;return c(t)});',
    });
    await send('Page.navigate', { url: APP + '/' + query });
    const assentou = await esperarAssentar({
      send, cartografia: () => cartografiaChegou, quadros: 700, teto: 180000,
    });
    // buffer EFETIVO, não a janela pedida: 700x1800 vira 684x1705 depois da
    // barra de rolagem e do chrome do headless, e é o buffer que decide o
    // aspecto que o shader vê
    const buf0 = await send('Runtime.evaluate', {
      expression: "(()=>{const c=document.querySelector('canvas');"
        + "return c?c.width+'x'+c.height:'?'})()",
      returnByValue: true,
    });
    efetivo = buf0.result.value;
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(shot.data, 'base64');
    // captura preta ou página de erro: um md5 estável de NADA passaria no teste
    if (buf.length < 40000) throw new Error(`captura suspeita de vazia (${buf.length} B)`);
    if (png) writeFileSync(png, buf);
    return {
      hash: createHash('md5').update(buf).digest('hex').slice(0, 12) + '@' + efetivo,
      via: assentou.via,
      ms: assentou.ms,
    };
  } finally {
    chrome.kill();
    matarPerfil(perfil);
    await sleep(400);
    try { rmSync(perfil, { recursive: true, force: true }); } catch { /* perfil preso */ }
  }
}

/**
 * Captura uma lista de vistas em SÉRIE e grava o resultado em `arquivo` a
 * cada vista concluída. É o corpo do laço de sempre — o pai serial e cada
 * filho do paralelo chamam exatamente este.
 *
 * `base` é o que JÁ estava medido: no pai serial é o estado lido do disco,
 * e ele precisa ser reescrito junto a cada vista, senão uma queda no meio da
 * leva deixaria em disco só as vistas desta rodada — a retomada perderia
 * justamente as boas que já custaram GPU.
 *
 * Devolve `{ out, vias }`: `vias` é uma entrada por CAPTURA (não por vista),
 * 'sinal' ou 'quadros', e é o que `julgarProntidao` julga no fim da leva.
 */
async function capturarLista(vistas, arquivo, marca = '', base = {}) {
  const out = { ...base };
  const vias = [];
  for (const [nome, query, janela] of vistas) {
    out[nome] = [];
    const daVista = [];
    for (let k = 0; k < N; k++) {
      // capturas/ é gitignored e não existe em clone novo — criar aqui, senão
      // a única forma de OLHAR a diferença (o diff de pixel) morre no open()
      const png = SO ? resolve(ROOT, 'capturas', `ab-${LADO}-${nome}-${k}.png`) : null;
      if (png) mkdirSync(resolve(ROOT, 'capturas'), { recursive: true });
      // uma segunda chance por captura: o Chrome headless morre no arranque de
      // vez em quando, e perder a bateria por isso é caro demais
      let r = null;
      for (let tent = 1; tent <= 2 && r === null; tent++) {
        try {
          r = await capturar(query + PIN + EXTRA, png, janela);
        } catch (e) {
          console.log(`${marca}  ${nome} ${k} tentativa ${tent} falhou: ${e.message}`);
          if (tent === 2) throw e;
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
  const erro = conta.AUSENTE > 0;
  const bitIdentico = !erro && conta.DIFERE === 0 && conta.INSTÁVEL === 0;
  const sufixo = conta.NOVA ? ` · ${conta.NOVA} NOVA(s) sem baseline (nada a comparar)` : '';
  let resumo;
  if (erro) {
    resumo = `>>> VEREDITO INVÁLIDO — ${conta.AUSENTE} vista(s) AUSENTE(s) no `
      + '"depois": recapture o lado que falta antes de concluir qualquer coisa'
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
  const md5 = existsSync(ESTADO) && !process.env.DOZERO
    ? JSON.parse(readFileSync(ESTADO, 'utf8'))
    : {};

  const lista = VISTAS.filter(([nome]) => {
    if (SO) return nome === SO;
    if (SMOKE && !SENTINELAS.includes(nome)) return false;
    return true;
  });
  const pendentes = lista.filter(([nome]) => {
    if (md5[nome]?.length === N && !SO) {
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
      `\n${pendentes.length} vistas × ${N} capturas em `
      + `${((Date.now() - t0) / 60000).toFixed(1)} min (JOBS=${jobs}${SMOKE ? ', SMOKE' : ''})`
    );
  }

  let vistaAusente = false;
  if (LADO === 'depois') {
    const antes = JSON.parse(
      readFileSync(resolve(tmpdir(), `ab-identidade-antes${SUFIXO}.json`), 'utf8')
    );
    // `lista` e não `VISTAS`: o veredito cobra o que ESTA invocação pediu.
    // Com a leva completa são as 18; com SMOKE/vista única é o recorte, e
    // cobrar as outras como AUSENTE reprovaria o fluxo de iterar.
    const juizo = julgarVistas({ vistas: lista.map(([nome]) => nome), antes, depois: md5 });
    for (const l of juizo.linhas) console.log(l.texto);
    console.log('\n' + juizo.resumo);
    vistaAusente = juizo.erro;
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
  // vista AUSENTE sai ≠ 0 pelo mesmo motivo: um veredito que não julgou a
  // lista inteira não é veredito, e o silêncio de antes era o defeito
  if (prontidao.erro || vistaAusente) process.exit(1);
}

// SÓ A INVOCAÇÃO POR LINHA DE COMANDO roda a leva. `ab-identidade.test.mjs`
// importa `julgarVistas` — puro, sem Chrome e sem disco — e um import não
// pode subir 30 capturas nem pingar o dev server.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (FILHO !== null) await filho();
  else await pai();
}
