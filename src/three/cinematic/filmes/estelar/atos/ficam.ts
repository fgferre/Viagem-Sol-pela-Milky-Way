// O ATO 5 DO FILME ESTELAR — as anãs vermelhas que ficam: Próxima e
// TRAPPIST-1. Pontos e números nomeados de `roteiros/estelar/ficam.json`,
// no molde do prólogo (a conta aqui, com o porquê; o JSON só fala nomes).
import * as THREE from 'three';
import { estrelaVisitavelPorNome, raioDaEstrelaPc } from '../../../../../lib/atlas/estrelasVisitaveis';
import { baseDaOrbita, exoplanetaPorId, geometriaDoPlaneta } from '../../../../../lib/exoplanetas';
import { posicaoDoExoplanetaNaCena, raioDoPlanetaUa } from '../../../../world/exoplanetas';
import { JD_DO_FILME_TDB } from '../../../journey';
import { bezier, glide } from '../../../movimentos';
import { CIMA_DA_ECLIPTICA, UA, ate, perpendicular, rad } from '../../solar/atos/geometria';
import { ESTRELAS_DO_FILME } from '../estrelas';
import { PONTOS_DAS_JUNTAS } from './juntas';

const SOL = new THREE.Vector3(0, 0, 0);
const PROXIMA = ESTRELAS_DO_FILME['Proxima Centauri'];
const ALFA_CENTAURI = ESTRELAS_DO_FILME['Rigil Kentaurus'];
const SAIDA = PONTOS_DAS_JUNTAS.saidaDeSirius;
/** a direção `d` girada `graus` em torno de `eixo` */
const girada = (d: THREE.Vector3, eixo: THREE.Vector3, graus: number) => d.clone().applyAxisAngle(eixo, rad(graus));
const raioDaEstrela = (nome: string) => raioDaEstrelaPc(estrelaVisitavelPorNome(nome)!);

/** a lente das travessias e das paradas, em graus (a da junta) */
const LENTE = 40;
/** a meia largura do quadro de 16:9 em ângulo, na lente `graus` */
const meiaLargura = (graus: number) => Math.atan(Math.tan(rad(graus / 2)) * 16 / 9);

// ================= E1 — CASA, VISTA DE FORA =================
// De Sírius a Próxima a reta passa a 1,2 pc do Sol, e da saída o Sol está
// 27° ACIMA de Próxima (fora do quadro de 40°). O rumo da travessia gira
// para o Sol passar DENTRO do quadro: olhando o rumo, o Sol fica em
// `SOL_NO_QUADRO` (no terço da esquerda, um pouco acima do meio). A mira
// vira cedo de Próxima para o rumo (o Sol desce para dentro do quadro pelo
// alto); o voo começa devagar (`launch` no JSON), então o Sol fica ~2 s
// quase parado no terço, cresce e sai pelo alto à esquerda quando a câmera
// passa por ele (a ~0,7 pc). Com o Sol já fora a mira volta para Próxima,
// enquanto a curva dobra para ela. No fim o voo passa pela EMENDA, a
// `PAUSA_ANTES` pc de Próxima, onde a travessia exponencial (E1b) continua
// na mesma velocidade — na primeira versão ela recomeçava do repouso, e a
// câmera parava no vazio (nota do diretor, segunda passada).
/** onde o Sol fica no quadro, olhando o rumo da saída (frações da meia largura e da meia altura) */
const SOL_NO_QUADRO = { x: -1 / 3, y: 0.2 };
const PARA_O_SOL = ate(SAIDA, SOL);
/** o cima e a direita do quadro na saída, olhando o Sol */
const CIMA_NA_SAIDA = perpendicular(CIMA_DA_ECLIPTICA, PARA_O_SOL);
const DIREITA_NA_SAIDA = new THREE.Vector3().crossVectors(PARA_O_SOL, CIMA_NA_SAIDA);
/** o rumo: o Sol deslocado no quadro para `SOL_NO_QUADRO` */
const RUMO_DA_PASSAGEM = PARA_O_SOL.clone()
  .addScaledVector(DIREITA_NA_SAIDA, -SOL_NO_QUADRO.x * Math.tan(meiaLargura(LENTE)))
  .addScaledVector(CIMA_NA_SAIDA, -SOL_NO_QUADRO.y * Math.tan(rad(LENTE / 2)))
  .normalize();
/** um ponto muito além no rumo: a mira olha a direção, não um lugar */
const MIRA_DO_RUMO = SAIDA.clone().addScaledVector(RUMO_DA_PASSAGEM, 1e4);
/** onde a reta do rumo passa mais perto do Sol */
const PASSAGEM = SAIDA.clone().addScaledVector(RUMO_DA_PASSAGEM, RUMO_DA_PASSAGEM.dot(SOL.clone().sub(SAIDA)));
const PAUSA_ANTES = 0.35;
const DE_PROXIMA_PARA_A_PAUSA = ate(PROXIMA, PASSAGEM);
const PAUSA = PROXIMA.clone().addScaledVector(DE_PROXIMA_PARA_A_PAUSA, PAUSA_ANTES);
/** a curva: sai no rumo, segue quase reta pelo Sol e chega à pausa olhando Próxima */
const CURVA_DA_PASSAGEM = { saida: 2.4, chegada: 0.5 };
/** as durações de E1a e E1b, em s */
const DURACAO = { casaDeFora: 5, chegadaAProxima: 3 };
/** a derivada de `launch` (x^2,6, o avanço de E1a) na ponta, e a de `settle` (1 − (1 − x)^2,2) no começo */
const LAUNCH_NA_PONTA = 2.6;
const SETTLE_NO_COMECO = 2.2;
/** a velocidade (pc/s) com que E1a chega à emenda: a ponta da Bézier, 3·chegada, no avanço `launch` */
const VELOCIDADE_NA_EMENDA = (3 * CURVA_DA_PASSAGEM.chegada * LAUNCH_NA_PONTA) / DURACAO.casaDeFora;

// ================= E2 — A VIZINHA =================
// Próxima com o disco a um terço da altura do quadro (o raio do corpo a
// `DISCO` da meia altura), e Alfa Centauri, a 0,07 pc, como ponto ao
// fundo: a câmera fica do lado oposto a ela, e um arco lento em torno do
// cima a traz da beira direita do quadro para o terço da direita.
const DISCO = 1 / 3;
/** a distância ao centro em que um corpo de raio `r` toma `fracao` da meia altura na lente `graus` */
const distanciaParaODisco = (r: number, fracao: number, graus: number) =>
  r / Math.sin(Math.atan(fracao * Math.tan(rad(graus / 2))));
const RAIO_DO_ARCO_DE_PROXIMA = distanciaParaODisco(raioDaEstrela('Proxima Centauri'), DISCO, LENTE);
const PARA_ALFA = ate(PROXIMA, ALFA_CENTAURI);
const CIMA_EM_PROXIMA = perpendicular(CIMA_DA_ECLIPTICA, PARA_ALFA);
/** Alfa Centauri a `graus` à direita do centro, vista do arco */
const comAlfaA = (graus: number) => girada(PARA_ALFA.clone().negate(), CIMA_EM_PROXIMA, graus);
const ALFA_NO_ARCO = { de: 26, para: 13 };
const FIM_DO_ARCO = PROXIMA.clone().addScaledVector(comAlfaA(ALFA_NO_ARCO.para), RAIO_DO_ARCO_DE_PROXIMA);
/**
 * O AVANÇO DE E1b sem parar na emenda: a distância a Próxima cai por razão
 * constante, `d = d0·(d1/d0)^e(u)`, então a velocidade no começo é
 * `d0·ln(d0/d1)·e'(0)/T`. O avanço é `c·settle + (1 − c)·glide`: começa com
 * `e'(0) = 2,2·c`, a velocidade de E1a, e pousa no arco de E2 parado.
 */
const EMENDA_NA_CHEGADA =
  (VELOCIDADE_NA_EMENDA * DURACAO.chegadaAProxima) /
  (PAUSA_ANTES * Math.log(PAUSA_ANTES / RAIO_DO_ARCO_DE_PROXIMA) * SETTLE_NO_COMECO);

// ================= E3 — PRÓXIMA B =================
// O planeta só tem rosto de perto: a `PERTO_DE_B` raios dele. A câmera sai
// de Próxima de RÉ, olhando a estrela, e contorna o planeta enquanto
// chega: ele entra pelo canto e fica grande à esquerda, a estrela à
// direita. Estrela e rosto no mesmo quadro pedem a câmera do lado da
// noite (a fase `FASE_EM_B`, ângulo estrela–planeta–câmera): o planeta é
// um crescente largo, aceso do lado da estrela.
const B = posicaoDoExoplanetaNaCena('proxima-b', JD_DO_FILME_TDB, PROXIMA)!;
const R_B = raioDoPlanetaUa(exoplanetaPorId('proxima-b')!.planeta) * UA;
const PERTO_DE_B = 3.5;
const FASE_EM_B = 120;
const LENTE_EM_B = 50;
/** a lente do sistema aberto, no fim da subida */
const LENTE_ABERTA = 45;
const DE_B_PARA_A_ESTRELA = ate(B, PROXIMA);
const CIMA_EM_B = perpendicular(CIMA_DA_ECLIPTICA, DE_B_PARA_A_ESTRELA);
/** a câmera gira em torno do cima a partir da estrela: ela fica à direita */
const DE_B_PARA_A_CAMERA = girada(DE_B_PARA_A_ESTRELA, CIMA_EM_B, -FASE_EM_B);
const NO_ROSTO_DE_B = B.clone().addScaledVector(DE_B_PARA_A_CAMERA, PERTO_DE_B * R_B);
/** a mira: entre o planeta e a estrela, a `PLANETA_A_ESQUERDA` do caminho de um ao outro */
const PLANETA_A_ESQUERDA = 0.42;
const MIRA_EM_B = NO_ROSTO_DE_B.clone().add(
  ate(NO_ROSTO_DE_B, B).lerp(ate(NO_ROSTO_DE_B, PROXIMA), PLANETA_A_ESQUERDA).normalize()
    .multiplyScalar(NO_ROSTO_DE_B.distanceTo(PROXIMA))
);

// ================= E4 — PARA TRAPPIST-1 =================
// Duas metades num plano: primeiro a câmera se afasta do planeta (a conta
// centrada nele, de 3,5 raios a `LONGE_DE_B` UA) indo para o lado de
// TRAPPIST-1 e virando para ela; depois a travessia de 12 pc centrada na
// estrela, de frente, até o ponto do E5. Entre as duas a câmera passa
// parada por um ponto onde nada perto está à vista.
const TRAPPIST = ESTRELAS_DO_FILME['TRAPPIST-1'];
const LONGE_DE_B = 0.3;
const SAIDA_DE_B = B.clone().addScaledVector(ate(B, TRAPPIST), LONGE_DE_B * UA);

// ================= E5 — OS SETE PLANETAS GIRANDO =================
// Dois planos, dois relógios. Com o relógio a dia e meio por segundo um
// planeta passa pela câmera em centésimos de segundo e, de longe, é menor
// que um pixel — só o nome andaria. Então:
// E5a, relógio LENTO: câmera parada logo fora da órbita de g, quase no
// plano dela, olhando a estrela; g vem por trás e passa a `PASSAGEM_DE_G`
// UA, um disco que cruza o quadro logo abaixo da estrela, e as órbitas
// são riscos quase de perfil. E5b, relógio RÁPIDO: a câmera sobe e se
// afasta, as órbitas se abrem em elipses e os nomes dos planetas correm.
// O plano das órbitas fica DEITADO no quadro: o cima do filme (o polo da
// eclíptica) está a 67° do polo do sistema, então a câmera rola o que
// falta (`rolagemDeitada`).
const G = exoplanetaPorId('trappist-1g')!;
const POLO_DE_G = (() => {
  const geo = geometriaDoPlaneta(G.planeta, G.sistema);
  return new THREE.Vector3(...baseDaOrbita([TRAPPIST.x, TRAPPIST.y, TRAPPIST.z], geo.iGraus, geo.nodoGraus).polo);
})();
const RELOGIO = { lento: 0.025, rapido: 2 };
const DURACAO_DA_PASSAGEM = 5;
/** o instante (s do plano) em que g passa mais perto */
const G_PASSA_EM = 2.6;
/** a 0,0008 UA (17 raios de g) e na lente de 40°, o disco toma ~1/6 da
 *  altura do quadro na passagem; na primeira versão (0,001 UA, 50°), ~1/10 */
const PASSAGEM_DE_G = 0.0008;
const LENTE_NA_PASSAGEM = 40;
/** quantos graus abaixo da estrela g passa, visto da câmera: com o disco de ~3,4° de raio, a estrela fica rente à borda de cima */
const G_ABAIXO = 3;
const G_NA_PASSAGEM = posicaoDoExoplanetaNaCena(
  'trappist-1g', JD_DO_FILME_TDB + RELOGIO.lento * G_PASSA_EM, TRAPPIST
)!;
const RADIAL_DE_G = ate(TRAPPIST, G_NA_PASSAGEM);
const NA_ORBITA_DE_G = G_NA_PASSAGEM.clone()
  .addScaledVector(RADIAL_DE_G, PASSAGEM_DE_G * UA * Math.cos(rad(G_ABAIXO)))
  .addScaledVector(POLO_DE_G, PASSAGEM_DE_G * UA * Math.sin(rad(G_ABAIXO)));
/** onde a subida pousa: `ELEVACAO_FINAL` graus acima do plano, `DISTANCIA_FINAL` UA da estrela,
 *  `AVANCO_FINAL` graus adiante de onde g passou, no sentido das órbitas */
const ELEVACAO_FINAL = 28;
const DISTANCIA_FINAL = 0.12;
const AVANCO_FINAL = 25;
const SENTIDO_DAS_ORBITAS = (() => {
  const depois = posicaoDoExoplanetaNaCena('trappist-1g', JD_DO_FILME_TDB + RELOGIO.lento * G_PASSA_EM + 0.1, TRAPPIST)!;
  return Math.sign(new THREE.Vector3().crossVectors(RADIAL_DE_G, ate(TRAPPIST, depois)).dot(POLO_DE_G));
})();
const SISTEMA_ABERTO = TRAPPIST.clone().addScaledVector(
  girada(RADIAL_DE_G, POLO_DE_G, SENTIDO_DAS_ORBITAS * AVANCO_FINAL)
    .multiplyScalar(Math.cos(rad(ELEVACAO_FINAL)))
    .addScaledVector(POLO_DE_G, Math.sin(rad(ELEVACAO_FINAL))),
  DISTANCIA_FINAL * UA
);
/** a subida: sai subindo pelo polo e chega de lado, freando */
const SUBIDA = { saida: 0.35, chegada: 0.3 };

/**
 * A ROLAGEM QUE DEITA AS ÓRBITAS: da câmera em `pos` olhando `alvo`, o
 * ângulo que o rig gira em torno da visada (`camera.rotateZ`) para o polo
 * do sistema ficar de pé no quadro. Sem a rolagem o cima é o polo da
 * eclíptica feito perpendicular à visada (`cimaDoFilme`, longe do polo).
 */
export function rolagemDeitada(pos: THREE.Vector3, alvo: THREE.Vector3, polo = POLO_DE_G): number {
  const frente = ate(pos, alvo);
  const cima = perpendicular(CIMA_DA_ECLIPTICA, frente);
  const direita = new THREE.Vector3().crossVectors(frente, cima);
  return Math.atan2(-polo.dot(direita), polo.dot(cima));
}

/** os pontos nomeados do ato, em pc (o epílogo parte de `sistemaAberto`) */
export const PONTOS_FICAM: Readonly<Record<string, THREE.Vector3>> = {
  miraDoRumoDaCasa: MIRA_DO_RUMO,
  passagemPelaCasa1: SAIDA.clone().addScaledVector(RUMO_DA_PASSAGEM, CURVA_DA_PASSAGEM.saida),
  passagemPelaCasa2: PAUSA.clone().addScaledVector(DE_PROXIMA_PARA_A_PAUSA, CURVA_DA_PASSAGEM.chegada),
  pausaAntesDeProxima: PAUSA,
  arcoDeProximaDe: comAlfaA(ALFA_NO_ARCO.de),
  arcoDeProximaPara: comAlfaA(ALFA_NO_ARCO.para),
  chegadaAProxima: PROXIMA.clone().addScaledVector(comAlfaA(ALFA_NO_ARCO.de), RAIO_DO_ARCO_DE_PROXIMA),
  fimDoArcoDeProxima: FIM_DO_ARCO,
  proximaB: B,
  noRostoDeB: NO_ROSTO_DE_B,
  miraEmB: MIRA_EM_B,
  saidaDeB: SAIDA_DE_B,
  naOrbitaDeG: NA_ORBITA_DE_G,
  subida1: NA_ORBITA_DE_G.clone().addScaledVector(POLO_DE_G, SUBIDA.saida * DISTANCIA_FINAL * UA),
  subida2: SISTEMA_ABERTO.clone().addScaledVector(ate(TRAPPIST, SISTEMA_ABERTO), SUBIDA.chegada * DISTANCIA_FINAL * UA),
  sistemaAberto: SISTEMA_ABERTO,
};

const ROLAGEM_NA_PASSAGEM = rolagemDeitada(NA_ORBITA_DE_G, TRAPPIST);
const ROLAGEM_ABERTA = rolagemDeitada(SISTEMA_ABERTO, TRAPPIST);
/**
 * A ROLAGEM DA SUBIDA: a rampa (no ritmo do voo) de uma ponta à outra, mais
 * um pulso que acompanha o desvio do começo — subindo rente ao plano, a
 * visada inclina depressa e o polo pede até ~8° a menos. O pulso cresce
 * até `1/(2·VELOCIDADE)` do plano e some em `1/VELOCIDADE`; a amplitude é
 * o desvio medido no pico (o teste cobra o resto abaixo de 2°).
 */
const VELOCIDADE_DO_PULSO_DA_SUBIDA = 1.7;
const DESVIO_DA_SUBIDA = (() => {
  const pico = 1 / (2 * VELOCIDADE_DO_PULSO_DA_SUBIDA);
  const voo = bezier(
    PONTOS_FICAM.naOrbitaDeG, PONTOS_FICAM.subida1, PONTOS_FICAM.subida2, PONTOS_FICAM.sistemaAberto
  );
  const pos = voo(glide(pico), new THREE.Vector3());
  return rolagemDeitada(pos, TRAPPIST) - THREE.MathUtils.lerp(ROLAGEM_NA_PASSAGEM, ROLAGEM_ABERTA, glide(pico));
})();

/** os números nomeados do ato */
export const NUMEROS_FICAM: Readonly<Record<string, number>> = {
  lente: LENTE,
  raioDoArcoDeProxima: RAIO_DO_ARCO_DE_PROXIMA,
  lenteEmB: LENTE_EM_B,
  lenteNaPassagem: LENTE_NA_PASSAGEM,
  lenteAberta: LENTE_ABERTA,
  duracaoDaCasaDeFora: DURACAO.casaDeFora,
  duracaoDaChegadaAProxima: DURACAO.chegadaAProxima,
  emendaNaChegada: EMENDA_NA_CHEGADA,
  restoDaChegada: 1 - EMENDA_NA_CHEGADA,
  relogioLento: RELOGIO.lento,
  relogioRapido: RELOGIO.rapido,
  duracaoDaPassagem: DURACAO_DA_PASSAGEM,
  rolagemNaPassagem: ROLAGEM_NA_PASSAGEM,
  rolagemAberta: ROLAGEM_ABERTA,
  desvioDaSubida: DESVIO_DA_SUBIDA,
  velocidadeDoPulsoDaSubida: VELOCIDADE_DO_PULSO_DA_SUBIDA,
};

/** para os testes: o que o ato promete, em números */
export const FICAM = {
  SOL_NO_QUADRO, DISCO, ALFA_NO_ARCO, meiaLargura, PERTO_DE_B, R_B, FASE_EM_B, G_PASSA_EM, PASSAGEM_DE_G,
  G_ABAIXO, POLO_DE_G, ELEVACAO_FINAL, RELOGIO, VELOCIDADE_NA_EMENDA,
} as const;
