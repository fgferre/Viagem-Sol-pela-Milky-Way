// sim/activity.js — modelo magnético: cargas/regiões ativas, ciclo de 11
// anos e bFieldJS (espelho JS do BFIELD_GLSL). Corpo movido verbatim;
// buildCharges/seedSimulation rodam NA CHAMADA da factory (posição do init).
//
// A EXCEÇÃO DECLARADA AO "OS 14 VENDORIZADOS NÃO SE TOCAM" (21/08, item 5
// das pendências) — o precedente é o das duas pontes de escala. O que o
// doador tinha aqui era um ACUMULADOR de fase (um relógio somando
// delta por quadro) e um lifecycle de regiões que dependia do CAMINHO: a
// posição vinha de uma integral de deriva com limitador, e o renascimento
// disparava por latch de renascimento, consumindo o stream COMPARTILHADO do
// `srand`. Com isso, chegar ao mesmo instante por dois caminhos dava dois
// Sóis, e o relógio não sabia andar para trás.
//
// O QUE ESTÁ NO LUGAR: o estado das regiões é FUNÇÃO PURA de um tempo
// único, `ctx.tempoDoCiclo`, que a lei da estrela deriva da data simulada
// (`estrela/cicloDeAtividade.ts`). Cada região tem um índice de VIDA
// (`k = floor((T + fase)/período)`), a vida tem semente própria — não um
// stream que anda — e a deriva diferencial é forma FECHADA na idade da
// vida. Nenhum acumulador, nenhum latch, nenhum cap: `estadoEm(T)` é o
// mesmo vindo de frente, de trás ou direto.
//
// OS DOIS RELÓGIOS, declarados: o RÁPIDO (`ctx.elapsed` — granulação,
// rotação, coroa, flares, proeminências) continua sendo tempo de tela e
// segue acumulando; o LENTO (`ctx.tempoDoCiclo` — fase, regiões ativas,
// grupos de manchas) pendura na DATA. Misturá-los foi o defeito.

import * as THREE from 'three';
import { cycleDepthFor, cycleEasingFor, cycleMultiplierFor } from './cycle.js';

export function createActivity(ctx){
  var srand = ctx.srand, simUniforms = ctx.simUniforms,
      seedSimulation = ctx.gran.seedSimulation;
  // ---------------------------------------------------------------
  // MODELO MAGNÉTICO: o que organiza a cromosfera real é o campo B.
  // Aproximamos com cargas pontuais logo abaixo da superfície:
  //  - 4 regiões ativas BIPOLARES (par líder/seguidor separado em
  //    longitude, em faixas de latitude, polaridade do líder oposta por
  //    hemisfério — lei de Hale);
  //  - 2 cargas polares fracas (dipolo global de fundo).
  // Tudo deriva do MESMO campo: fibrilas seguem B tangencial, filamentos
  // vivem nas linhas neutras (Br=0), manchas nos pés das cargas, plage
  // onde |B| é forte. Posições em espaço do objeto: giram com a esfera.
  // ---------------------------------------------------------------
  var charges = [];
  var pairStates = [];
  function sphDir(lo, la){
    return new THREE.Vector3(Math.cos(la)*Math.cos(lo), Math.sin(la), Math.cos(la)*Math.sin(lo));
  }
  // ---------------------------------------------------------------
  // FASE 3 — CICLO DE 11 ANOS. Um escalar de fase (cyclePhase01) modula
  // a maquinaria de lifecycle que já existe:
  //  - lei de Spörer: a banda de emergência migra de ±35° para ±5° ao
  //    longo do ciclo (diagrama borboleta) — placePair reaproveita o
  //    MESMO sorteio de latitude (a contagem de draws da vida não muda);
  //  - envelope de atividade: |q| das regiões cresce ao máximo (fase
  //    0.5) e definha no mínimo — uActivity (coroa, cooldown de flare,
  //    íris) segue de graça ("uma estrela, um estado");
  //  - flip de Hale: a polaridade líder/seguidor inverte por ciclo
  //    (ps.polSign, aplicado na emergência — regiões vivas não trocam);
  //  - reversão polar: o dipolo de fundo cruza zero perto do máximo
  //    (fase ~0.45) e renasce invertido (cargas polares moduladas).
  // O TEMPO DO CICLO vem da DATA (`ctx.tempoDoCiclo`, escrito pelo
  // corpo a cada quadro a partir de `faseDoCiclo(jd)`), na unidade
  // herdada: 1800 unidades por ciclo (~2,24 dias por unidade). Foi o
  // acumulador que morreu, não a régua — período de vida, deriva e
  // envelopes seguem calibrados nela.
  // Com cycle=0 NADA disto roda: fase congelada, polSign=1, ampK=1,
  // cargas polares intocadas.
  // ---------------------------------------------------------------
  // `ctx.cyclePhase01` (0 = mínimo, 0.5 = máximo) e `ctx.cycleN` (o
  // número do ciclo, cuja paridade dá Hale) NASCEM no contexto, escritos
  // por quem conhece a data — não aqui. Zerá-los na fábrica apagaria a
  // data com que o corpo foi construído.
  ctx.cycleHale = 1;          // sinal de Hale do ciclo corrente
  ctx.cycleAmpK = 1;          // ganho global de atividade (já com a DOSE)
  ctx.cyclePolF = 1;          // fator do dipolo polar (1 = default)
  ctx.solarMaxK = 0;          // 0 em amp<=1.0, 1 em amp>=1.14 (smoothstep)
  var cyclePolarN = null, cyclePolarS = null;
  function cycleMultiplier(){
    return cycleMultiplierFor(ctx.LAPSE_K);
  }
  function cycleDepth(){
    // lapse sozinho liga o ciclo (modo documental de um toque)
    return cycleDepthFor(ctx.CYCLE_K, ctx.LAPSE_K);
  }
  function updateCycleState(){
    var d = cycleDepth();
    ctx.cycleHale = ((ctx.cycleN % 2) + 2) % 2 === 0 ? 1 : -1;
    // atividade: sobe rápido ao máximo (~0.35), decai lento. Piso 0.10
    // e swing maior (painel de juízes F3: max↔min a "~1 stop" não
    // contava a história — o mínimo precisa de disco quase limpo, ver
    // ref-06 vs ref-07); em fase 0.35 vale ~1.03 (ligar o knob não dá
    // pop perceptível nas regiões vivas)
    var amp = 0.10 + 1.06 * Math.pow(Math.sin(Math.PI * ctx.cyclePhase01), 1.15);
    // A DOSE DA DRAMATURGIA entra AQUI e só aqui: ela multiplica a
    // OCUPAÇÃO (quanta atividade da fase aparece) e não encosta em fase,
    // banda de Spörer, sinal de Hale nem reversão polar — o `cyclePolF`
    // abaixo continua saindo da fase crua. Fora da viagem vale 1, e
    // multiplicar por 1,0 é bit-exato: sem dose e com dose plena
    // desenham o mesmo Sol byte a byte.
    ctx.cycleAmpK = (1.0 + (amp - 1.0) * d) * ctx.doseDoSol;
    // EVENTO DE MÁXIMO — escalar de apresentação derivado da física:
    // smoothstep(1.0, 1.14, ampK). Teto real do amp = 1.16 (fase 0.5,
    // d=1). Com o ciclo desligado (d=0) ampK=1.0 => maxK=0 exato — o
    // frame default/det permanece byte-idêntico por construção.
    var mk = (ctx.cycleAmpK - 1.0) / 0.14;
    mk = mk < 0 ? 0 : (mk > 1 ? 1 : mk);
    ctx.solarMaxK = mk * mk * (3.0 - 2.0 * mk);
    // dipolo polar: cruza zero na fase 0.45 (reversão no máximo) e
    // satura invertido no fim do ciclo; contínuo na virada de ciclo
    // porque o sinal de Hale flipa junto
    var pol = Math.cos(Math.PI * Math.min(1.0, ctx.cyclePhase01 / 0.9)) * ctx.cycleHale;
    ctx.cyclePolF = 1.0 + (pol - 1.0) * d;
    if (cyclePolarN){
      cyclePolarN.w =  0.5 * ctx.cyclePolF;
      cyclePolarS.w = -0.5 * ctx.cyclePolF;
    }
  }
  // lei de Spörer: banda de emergência na fase EM QUE A REGIÃO EMERGIU —
  // e "em que emergiu" é literal desde 21/08. Ler a fase VIVA aqui era o
  // último resíduo de caminho do modelo: a mesma vida, alcançada por
  // datas diferentes, nascia em latitudes diferentes. Uma região real
  // carrega a banda do dia em que emergiu pelo resto da vida.
  // latR é o MESMO sorteio uniforme que o caminho default consome — sem
  // draws novos. defLat entra p/ o blend suave de profundidade do knob.
  function cycleEmergenceLat(latR, hemi, defLat, faseNasc){
    var d = cycleDepth();
    var latC = (35.0 - 30.0 * faseNasc) * (Math.PI / 180.0);
    var latW = (8.0 - 4.0 * faseNasc) * (Math.PI / 180.0);
    var lat = Math.max(0.035, latC + (latR * 2.0 - 1.0) * latW);
    return defLat + (hemi * lat - defLat) * d;
  }
  // o instante do NASCIMENTO da vida `k`, e a fase/ciclo que ele viu.
  // `T = (ciclo + fase)·UNIDADES`, então a inversa é uma divisão.
  function estadoDoNascimento(ps, k){
    var t = k * ps.period - ps.phase;
    var tot = t / ctx.UNIDADES_POR_CICLO;
    var ciclo = Math.floor(tot);
    return { fase: tot - ciclo, hale: ((ciclo % 2) + 2) % 2 === 0 ? 1 : -1 };
  }
  // O NASCIMENTO DE UMA VIDA. `k` é o índice da vida da região (quantos
  // períodos já se passaram no relógio do ciclo) e é ELE que semeia o
  // sorteio: mesma vida, mesma posição, venha o relógio de onde vier.
  // Antes isto consumia o `srand` COMPARTILHADO, e por isso o número de
  // renascimentos no caminho decidia onde as regiões estavam — o resíduo
  // que atravessava o portal do Atlas (item 5).
  //
  // A REJEIÇÃO é a do nascimento original do doador — cada par nasce
  // contra os que JÁ nasceram (índices menores) —, agora aplicada a toda
  // vida em vez de só ao boot. Ler o líder VIVO dos outros seria
  // recursão: a posição viva deles depende do T que estamos calculando.
  function placePair(ps, i, k){
    var rand = ctx.correnteDaVida('regiao', i, k);
    var nasc = estadoDoNascimento(ps, k);
    // Uma nova posição equivale a uma nova região magnética física. A
    // geração dá identidade estável à descoberta educativa sem depender
    // dos pontos visuais auxiliares de manchas — e agora ela É a vida.
    ps.eduGeneration = k;
    var lat, lon, lead;
    for (var attempt = 0; attempt < 24; attempt++){
      var latR = rand();
      lat = ps.hemi * (0.24 + latR*0.30);
      // FASE 3 — lei de Spörer: com o ciclo ligado a banda migra
      // 35°→5° conforme a fase DA DATA
      if (cycleDepth() > 0.001) lat = cycleEmergenceLat(latR, ps.hemi, lat, nasc.fase);
      lon = rand()*Math.PI*2;
      lead = sphDir(lon, lat);
      var minAng = Math.PI, minLon = Math.PI;
      for (var j = 0; j < i; j++){
        var other = pairStates[j];
        var od = new THREE.Vector3(other.lead0.x, other.lead0.y, other.lead0.z);
        if (od.lengthSq() < 1e-6) continue;
        minAng = Math.min(minAng, lead.angleTo(od.normalize()));
        // separação LONGITUDINAL mínima entre pares vivos (envelope
        // GONG 2012-2026): sem ela os pares sorteavam no mesmo lado e a
        // teia de linhas neutras — e os filamentos — aglomerava num
        // hemisfério; fallback após 24 tentativas = comportamento antigo
        var dl = Math.abs(lon - Math.atan2(od.z, od.x));
        dl = dl % (Math.PI*2); if (dl > Math.PI) dl = Math.PI*2 - dl;
        minLon = Math.min(minLon, dl);
      }
      if (minAng > 0.55 && minLon >= 1.2) break;
    }
    // lei de Joy: o par é inclinado — o seguidor fica mais perto do polo;
    // separação maior que o raio das manchas (pares reais não se tocam)
    var sep = 0.19 + rand()*0.10;
    var follLat = lat + ps.hemi * sep * (0.105 + rand()*0.071);   // tilt de Joy 6-10 graus
    lead.multiplyScalar(0.88);
    var foll = sphDir(lon+sep, follLat).multiplyScalar(0.88);
    // a posição de NASCIMENTO fica guardada: a posição viva é ela mais a
    // deriva diferencial da IDADE, em forma fechada (ver `derivarDe`)
    ps.lead0.copy(lead);
    ps.foll0.copy(foll);
    // FASE 3 — flip de Hale: a região que EMERGE carrega a polaridade do
    // ciclo EM QUE EMERGIU (regiões vivas não trocam de sinal no meio da
    // vida). Com o ciclo desligado, polSign=1 = comportamento de sempre.
    ps.polSign = (cycleDepth() > 0.001) ? nasc.hale : 1;
  }
  (function buildCharges(){
    for (var i=0;i<4;i++){
      var hemi = (i%2===0) ? 1 : -1;
      var q = (1.0 + srand()*0.8) * hemi;
      var lead = new THREE.Vector4(0,0,0, q);
      var foll = new THREE.Vector4(0,0,0, -q*0.85);
      charges.push(lead); charges.push(foll);
      // ciclo de vida: emerge -> madura -> decai -> some (e renasce em
      // outro lugar). Fases espalhadas: sempre há 2-3 regiões vivas.
      // `q`, `period` e `phase` são a IDENTIDADE do par e continuam
      // saindo do stream de construção: são sorteados uma vez e não
      // andam mais — não é deles que vinha o resíduo.
      var ps = {
        lead: lead, foll: foll, baseQ: q, hemi: hemi,
        period: 150 + srand()*90,
        phase: 0, vida: null, polSign: 1,
        lead0: new THREE.Vector3(), foll0: new THREE.Vector3(),
        eduGeneration: -1, eduAnnouncedGeneration: -1
      };
      ps.phase = (i/4 + srand()*0.1) * ps.period;
      pairStates.push(ps);
    }
    charges.push(cyclePolarN = new THREE.Vector4(0,  0.55, 0,  0.5));
    charges.push(cyclePolarS = new THREE.Vector4(0, -0.55, 0, -0.5));
  })();
  // FASE 3: com ?cycle/?lapse na URL o estado do ciclo (amp, dipolo
  // polar) vale desde o primeiro frame/seed do sim; com knob=0 é no-op
  updateCycleState();
  // as regiões nascem NO INSTANTE DA DATA, antes de o Br ser semeado: o
  // relaxamento longo do `prime` tem de convergir para as cargas que a
  // data pede, não para um estado de t=0 que não existe mais
  updateActiveRegions(ctx.tempoDoCiclo);
  simUniforms.uChargesSim.value = charges;
  seedSimulation();
  function lifeEnvelope(x){   // x em 0..1 dentro do período
    if (x < 0.14) { var a = x/0.14; return a*a*(3.0-2.0*a); }
    if (x < 0.58) return 1.0;
    if (x < 0.90) { var b = (x-0.58)/0.32; return 1.0 - b*b*(3.0-2.0*b); }
    return 0.0;
  }
  // BLOCO C (rodada de movimento): sob LAPSE o relógio das regiões corre
  // ~×27-40 e o nascimento/morte de plage/faculae vira POP no limbo
  // (strobo 1.10% no cenário lapse vs 0.46% idle — baseline temporal).
  // Rampas esticadas ×1.75 (nascimento 0.14→0.245, morte 0.32→0.56;
  // a morte segue terminando em 0.90 — o renascimento não muda de fase).
  function lifeEnvelopeLapse(x){
    if (x < 0.245) { var a = x/0.245; return a*a*(3.0-2.0*a); }
    if (x < 0.34) return 1.0;
    if (x < 0.90) { var b = (x-0.34)/0.56; return 1.0 - b*b*(3.0-2.0*b); }
    return 0.0;
  }
  // O easing deriva do multiplicador efetivo: quando o relógio já corre
  // perto de 10× (menor step da UI), as rampas largas entram por completo
  // para nascimento/morte não virarem strobo. Com lapse=0 o envelope
  // original volta sem aritmética extra. Usada só
  // pelos consumidores do relógio WARPADO (regiões reais + grupos de
  // manchas do sun.js — que assim seguem em sincronia com a plage);
  // proeminências/loops correm em wall-clock e ficam no envelope de
  // sempre.
  function lifeEnvelopeEased(x){
    var e = lifeEnvelope(x);
    if (ctx.LAPSE_K > 0){
      var easeK=cycleEasingFor(cycleMultiplier());
      e += (lifeEnvelopeLapse(x) - e)*easeK;
    }
    return e;
  }
  // (O EVENTO "máximo/mínimo solar" do doador MORREU em 21/08, item 5.
  // Ele era um acelerador TEMPORÁRIO do acumulador de fase — comprimia
  // o relógio de fase até um alvo e o congelava lá. Sem acumulador não há
  // o que acelerar: a fase agora é a da DATA, e quem quiser ver o máximo
  // solar anda o relógio do céu até 2024-10, que é onde ele está de
  // verdade. Nesta casa a prévia nunca teve consumidor — era hook do
  // painel do doador, que não viajou.)

  // O ESTADO DAS REGIÕES NO INSTANTE T — função PURA, sem acumulador,
  // sem latch e sem cap. Chamar com o mesmo T duas vezes dá o mesmo
  // estado; chamar com T menor anda para trás sem re-integrar nada.
  //
  // Três peças:
  //  1. a VIDA: `k = floor((T + fase)/período)` diz qual encarnação da
  //     região está em cena, e `x` onde ela está no envelope;
  //  2. o NASCIMENTO: quando a tupla de vidas muda, os quatro pares são
  //     re-sorteados EM ORDEM — cada um contra os que já nasceram —, com
  //     a semente da vida. Re-sortear os quatro (e não só quem virou)
  //     é o que torna a rejeição função da tupla, e a tupla função de T;
  //  3. a DERIVA: rotação diferencial de Snodgrass em FORMA FECHADA
  //     sobre a IDADE da vida (`x·período`), na mesma constante do sim.
  //     A latitude não muda sob rotação em Y, então ω é constante na
  //     vida e a integral é exata — nada de somar dt por quadro.
  function updateActiveRegions(timeNow){
    var i, ps, k, mudou = false;
    // a comparação é NUMÉRICA e não uma chave concatenada: isto roda por
    // quadro, e o núcleo do doador não aloca no caminho quente
    for (i=0;i<pairStates.length;i++){
      ps = pairStates[i];
      if (ps.vida !== Math.floor((timeNow + ps.phase) / ps.period)) mudou = true;
    }
    if (mudou){
      for (i=0;i<pairStates.length;i++){
        ps = pairStates[i];
        k = Math.floor((timeNow + ps.phase) / ps.period);
        ps.vida = k;
        placePair(ps, i, k);
      }
    }
    for (i=0;i<pairStates.length;i++){
      ps = pairStates[i];
      var x = ((timeNow + ps.phase) % ps.period) / ps.period;
      var env = lifeEnvelopeEased(x);   // = lifeEnvelope(x) com lapse=0
      // FASE 3: polSign (flip de Hale) e cycleAmpK (envelope de
      // atividade do ciclo, já com a DOSE) valem 1 com o ciclo
      // desligado — o produto por 1.0 é bit-exato.
      // A posição nova é sorteada na fase morta (x>=0.90), onde o
      // envelope já chegou a zero: a relocação é eletricamente
      // invisível, sem piso de carga a teleportar.
      ps.lead.w =  ps.baseQ * ps.polSign * env * ctx.cycleAmpK;
      ps.foll.w = -ps.baseQ * ps.polSign * 0.85 * env * ctx.cycleAmpK;
      // MACRO_SLOW: a advecção do sim desacelera junto (SIM_DT) — as
      // cargas derivam na mesma escala para as manchas não descolarem
      // da plage (família do bug 4 da auditoria de movimento)
      var idade = x * ps.period * ctx.MACRO_SLOW;
      derivarDe(ps.lead0, ps.lead, idade);
      derivarDe(ps.foll0, ps.foll, idade);
    }
  }
  // a posição VIVA = nascimento + deriva diferencial da idade, exata.
  // Mesma constante do sim (vel.x = (Ω(lat)-14.18)*0.00028 em uv por
  // tempo simulado); a rotação é em Y, então `y` (e portanto Ω) não muda.
  function derivarDe(nasc, saida, idade){
    var lat = Math.asin(Math.max(-1, Math.min(1, nasc.y)));
    var s2 = Math.sin(lat)*Math.sin(lat);
    var omega = 14.71 - 2.39*s2 - 1.78*s2*s2;
    var dlon = (omega - 14.18) * 0.00028 * 6.28318 * idade;
    var cd = Math.cos(dlon), sd = Math.sin(dlon);
    saida.x = nasc.x*cd - nasc.z*sd;
    saida.y = nasc.y;
    saida.z = nasc.x*sd + nasc.z*cd;
  }
  // value noise 1D com 3 oitavas (flicker 1/f do plasma suspenso)
  function vhash1(i){ var s = Math.sin(i*127.1 + 311.7)*43758.5453; return s - Math.floor(s); }
  function vnoise1(x){
    var i = Math.floor(x), fr = x - i, u = fr*fr*(3-2*fr);
    return (vhash1(i)*(1-u) + vhash1(i+1)*u)*2 - 1;
  }
  function flicker1f(t){
    return (vnoise1(t) + 0.5*vnoise1(t*2.17 + 7.3) + 0.25*vnoise1(t*4.61 + 13.1)) / 1.75;
  }
  // avaliação do mesmo campo em JS (para ancorar proeminências etc.).
  // Roda por proeminência a cada frame: aritmética escalar num vetor
  // reutilizado — zero alocações no caminho quente (o retorno é
  // compartilhado; nenhum chamador o retém entre chamadas)
  var bFieldOut = new THREE.Vector3();
  function bFieldJS(p){
    var bx = 0, by = 0, bz = 0;
    for (var i=0;i<charges.length;i++){
      var c = charges[i];
      var dx = p.x-c.x, dy = p.y-c.y, dz = p.z-c.z;
      var r2 = dx*dx + dy*dy + dz*dz + 1e-3;
      var k = c.w/(r2*Math.sqrt(r2));
      bx += dx*k; by += dy*k; bz += dz*k;
    }
    return bFieldOut.set(bx, by, bz);
  }
  return { charges: charges, pairStates: pairStates,
           updateCycleState: updateCycleState, placePair: placePair,
           updateActiveRegions: updateActiveRegions, cycleDepth: cycleDepth,
           cycleMultiplier: cycleMultiplier,
           lifeEnvelope: lifeEnvelope, lifeEnvelopeEased: lifeEnvelopeEased,
           bFieldJS: bFieldJS, flicker1f: flicker1f,
           cyclePolarN: cyclePolarN, cyclePolarS: cyclePolarS };
}
