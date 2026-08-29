// Item 75: dados do roteiro → peças já usadas pela câmera.
// Lido uma vez, na montagem; não interpreta texto nem aloca por quadro.
import * as THREE from 'three';
import { erro, lista, numero, objeto } from './dadosDoRoteiro';
import {
  aproximacaoExponencial, arcoAxial, bezier, easeOut, glide, helice, intervalo,
  launch, line, linear, lookEvento, lookPan, lookRaspao, orbit, panLook,
  panThenHold, quadratic, raspao, sequencia, settle, settleFreeze, smooth, still, trajeto,
  type Ease, type PosFn,
} from './movimentos';

export interface CameraDoPlano {
  dur: number;
  pos: PosFn;
  look: PosFn;
  fov0: number;
  fov1: number;
  ease?: Ease;
  /** Inclinação em radianos; os quadros de medição podem declarar valor fixo. */
  roll?: Ease;
  /** Pulso de velocidade entregue ao rig e ao pós-processamento existentes (0..1). */
  warp?: Ease;
  /**
   * EASE SÓ DO FOV (F3), quando ele precisa divergir do da trajetória.
   * Ausente, o fov usa o `ease` do plano, como sempre — e a expressão
   * que `at` avalia é EXATAMENTE a de antes, então nenhum plano herdado
   * muda um bit. Nasceu por causa de um plano: a hélice da abertura
   * refilmada, cuja posição precisa do parâmetro CRU (a distância é
   * exponencial em segundos de relógio) enquanto o zoom 26°→56° tem de
   * continuar com o `glide` de sempre. O mergulho de volta da coda usa
   * o mesmo par (ease cru + fovEase) pela mesma razão. Sem este campo, a alternativa
   * seria inverter o smoothstep dentro do `pos` por Newton para
   * recuperar o `k` cru — conta iterativa por quadro para reproduzir um
   * número que já existe.
   */
  fovEase?: Ease;
}

const RITMOS = { linear, quadratic, smooth, easeOut, glide, launch, settle, settleFreeze };

function par(valor: unknown, campo: string, lerNumero = numero): [number, number] {
  if (!Array.isArray(valor) || valor.length !== 2) return erro(campo, 'deve ter dois números');
  return [lerNumero(valor[0], `${campo}[0]`), lerNumero(valor[1], `${campo}[1]`)];
}

function fracao(valor: unknown, campo: string, lerNumero = numero): number {
  const n = lerNumero(valor, campo);
  if (n <= 0 || n > 1) return erro(campo, 'deve estar entre 0 (exclusivo) e 1');
  return n;
}

function ritmo(valor: unknown, campo: string): Ease | undefined {
  if (valor === undefined) return undefined;
  if (typeof valor !== 'string' || !Object.hasOwn(RITMOS, valor)) {
    return erro(campo, `desconhecido: ${String(valor)}`);
  }
  return RITMOS[valor as keyof typeof RITMOS];
}

/** Curvas em tempo de relógio, independentes do ritmo da trajetória. */
function curvaEscalar(
  valor: unknown, campo: string, normalizada = false, lerNumero = numero
): Ease | undefined {
  if (valor === undefined) return undefined;
  const c = objeto(valor, campo);
  const lerValor = (chave: string) => {
    const n = lerNumero(c[chave], `${campo}.${chave}`);
    if (normalizada && (n < 0 || n > 1)) {
      return erro(`${campo}.${chave}`, 'deve estar entre 0 e 1');
    }
    return n;
  };
  let curva: Ease;
  switch (c.tipo) {
    case 'fixo': {
      const n = lerValor('valor');
      curva = () => n;
      break;
    }
    case 'rampa': {
      const de = lerValor('de');
      const para = lerValor('para');
      const ease = ritmo(c.ritmo, `${campo}.ritmo`) ?? linear;
      curva = (k) => THREE.MathUtils.lerp(de, para, ease(k));
      break;
    }
    case 'frenagem': {
      const n = lerValor('amplitude');
      curva = (k) => n * (1 - k) * (1 - k);
      break;
    }
    case 'pulso': {
      const n = lerValor('amplitude');
      const base = c.base === undefined ? 0 : lerValor('base');
      const frequencia = c.frequencia === undefined ? 1 : fracao(c.frequencia, `${campo}.frequencia`, lerNumero);
      if (!Number.isFinite(base + n) || (normalizada && base + n > 1)) {
        return erro(`${campo}.base`, 'somada à amplitude ultrapassa o limite');
      }
      const pulso: Ease = (k) => n * Math.sin(Math.PI * k * frequencia);
      curva = base === 0 ? pulso : (k) => base + pulso(k);
      break;
    }
    case 'decaimento': {
      const n = lerValor('amplitude');
      const ate = c.ate === undefined ? 1 : fracao(c.ate, `${campo}.ate`, lerNumero);
      const ease = ritmo(c.ritmo, `${campo}.ritmo`) ?? linear;
      const expoente = c.expoente === undefined ? 1 : lerNumero(c.expoente, `${campo}.expoente`);
      if (expoente <= 0) return erro(`${campo}.expoente`, 'deve ser positivo');
      curva = expoente === 1
        ? (k) => n * (1 - ease(Math.min(k / ate, 1)))
        : (k) => n * (1 - ease(Math.min(k / ate, 1))) ** expoente;
      break;
    }
    case 'pulso-limitado':
    case 'pulso-frenado': {
      const n = lerValor('amplitude');
      const velocidade = c.velocidade === undefined
        ? 1
        : lerNumero(c.velocidade, `${campo}.velocidade`);
      if (velocidade <= 0) return erro(`${campo}.velocidade`, 'deve ser positiva');
      const pulso: Ease = (k) => n * Math.sin(Math.PI * Math.min(k * velocidade, 1));
      curva = c.tipo === 'pulso-limitado'
        ? pulso
        : (k) => pulso(k) * (1 - k);
      break;
    }
    case 'soma': {
      const dados = lista(c.curvas, `${campo}.curvas`);
      if (dados.length < 2) return erro(`${campo}.curvas`, 'deve conter ao menos duas curvas');
      const curvas = Array.from(dados, (item, i) =>
        curvaEscalar(item, `${campo}.curvas[${i}]`, false, lerNumero) as Ease);
      curva = (k) => {
        let total = curvas[0](k);
        for (let i = 1; i < curvas.length; i++) total += curvas[i](k);
        return total;
      };
      break;
    }
    case 'pouso': {
      const de = c.de === undefined ? 0 : lerValor('de');
      const para = lerValor('para');
      const inicio = c.inicio === undefined ? 0 : lerNumero(c.inicio, `${campo}.inicio`);
      if (inicio < 0 || inicio >= 1) return erro(`${campo}.inicio`, 'deve ficar entre 0 e 1, sem o fim');
      const pousaEm = fracao(c.pousaEm, `${campo}.pousaEm`, lerNumero);
      const expoente = lerNumero(c.expoente, `${campo}.expoente`);
      if (expoente <= 0) return erro(`${campo}.expoente`, 'deve ser positivo');
      curva = (k) => {
        if (k <= inicio) return de;
        const x = (k - inicio) / (1 - inicio);
        const u = Math.min(x / pousaEm, 1);
        return de + (para - de) * (1 - Math.pow(1 - u, expoente));
      };
      break;
    }
    default: return erro(`${campo}.tipo`, `desconhecido: ${String(c.tipo)}`);
  }
  if (normalizada) {
    for (let i = 0; i <= 512; i++) {
      const valor = curva(i / 512);
      if (!Number.isFinite(valor) || valor < 0 || valor > 1) {
        return erro(campo, 'deve permanecer entre 0 e 1');
      }
    }
  }
  return curva;
}

/** Pontos em pc e parâmetros numéricos nomeados, copiados na montagem; sem expressões. */
export function lerPlanoDeCamera(
  dado: unknown,
  pontos: Readonly<Record<string, THREE.Vector3>> = {},
  numeros: Readonly<Record<string, number>> = {}
): CameraDoPlano {
  const lerNumero = (valor: unknown, campo: string): number => {
    if (typeof valor !== 'string') return numero(valor, campo);
    if (!Object.hasOwn(numeros, valor)) return erro(campo, `não encontra o número “${valor}”`);
    return numero(numeros[valor], campo);
  };
  const p = objeto(dado, 'plano');
  const dur = lerNumero(p.duracao, 'duracao');
  if (dur <= 0) return erro('duracao', 'deve ser positiva');
  const [fov0, fov1] = par(p.lente, 'lente', lerNumero);
  if ([fov0, fov1].some((n) => n <= 0 || n >= 180)) {
    return erro('lente', 'deve ficar entre 0 e 180 graus, sem as pontas');
  }

  const ponto = (valor: unknown, campo: string): THREE.Vector3 => {
    if (typeof valor === 'string') {
      if (!Object.hasOwn(pontos, valor)) return erro(campo, `não encontra o ponto “${valor}”`);
      const v = pontos[valor];
      return new THREE.Vector3(numero(v.x, campo), numero(v.y, campo), numero(v.z, campo));
    }
    if (!Array.isArray(valor) || valor.length !== 3) {
      return erro(campo, 'deve ser um nome ou [x, y, z] em pc');
    }
    return new THREE.Vector3(
      numero(valor[0], `${campo}[0]`), numero(valor[1], `${campo}[1]`), numero(valor[2], `${campo}[2]`)
    );
  };

  const lerMovimento = (valor: unknown, campo: string): PosFn => {
    const m = objeto(valor, campo);
    let pos: PosFn;
    switch (m.tipo) {
      case 'fixo': pos = still(ponto(m.ponto, `${campo}.ponto`)); break;
      case 'reta': pos = line(ponto(m.de, `${campo}.de`), ponto(m.para, `${campo}.para`)); break;
      case 'curva':
        pos = bezier(
          ponto(m.de, `${campo}.de`), ponto(m.controle1, `${campo}.controle1`),
          ponto(m.controle2, `${campo}.controle2`), ponto(m.para, `${campo}.para`)
        );
        break;
      case 'trajeto': {
        const via = Array.from(lista(m.pontos, `${campo}.pontos`), (v, i) =>
          ponto(v, `${campo}.pontos[${i}]`));
        if (via.length < 2) return erro(`${campo}.pontos`, 'deve conter ao menos dois pontos');
        for (let i = 1; i < via.length; i++) {
          if (!Number.isFinite(via[i].distanceTo(via[0]))) {
            return erro(`${campo}.pontos[${i}]`, 'produz uma distância não finita');
          }
          if (via[i].distanceTo(via[i - 1]) === 0) {
            return erro(`${campo}.pontos[${i}]`, 'repete o ponto anterior; use um plano fixo para esperar');
          }
        }
        pos = trajeto(via);
        break;
      }
      case 'orbita':
      case 'helice': {
        const [r0, r1] = par(m.raio, `${campo}.raio`, lerNumero);
        if (r0 < 0 || r1 < 0) return erro(`${campo}.raio`, 'não pode ser negativo');
        const [a0, a1] = par(m.angulo, `${campo}.angulo`, lerNumero);
        const [h0, h1] = par(m.altura, `${campo}.altura`, lerNumero);
        const centro = ponto(m.centro, `${campo}.centro`);
        const unidadeDoAngulo = m.unidadeDoAngulo === undefined ? 'radianos' : m.unidadeDoAngulo;
        if (unidadeDoAngulo !== 'radianos' && unidadeDoAngulo !== 'graus') {
          return erro(`${campo}.unidadeDoAngulo`, 'deve ser radianos ou graus');
        }
        if (m.tipo === 'orbita') {
          pos = orbit(centro, r0, r1, a0, a1, h0, h1, unidadeDoAngulo);
        } else {
          if (r0 <= 0 || r1 <= 0) return erro(`${campo}.raio`, 'deve ser positivo na hélice');
          const [d0, d1] = par(m.distancia, `${campo}.distancia`, lerNumero);
          if (d0 <= 0 || d1 <= 0 || !Number.isFinite(d1 / d0) || d1 / d0 === 0) {
            return erro(`${campo}.distancia`, 'deve ter distâncias positivas e razão finita, não nula');
          }
          pos = helice(centro, r0, r1, a0, a1, h0, h1, d0, d1,
            ritmo(m.ritmoDaDirecao, `${campo}.ritmoDaDirecao`), unidadeDoAngulo);
        }
        break;
      }
      case 'aproximacao': {
        const centro = ponto(m.centro, `${campo}.centro`);
        const de = ponto(m.de, `${campo}.de`);
        const para = ponto(m.para, `${campo}.para`);
        const d0 = de.distanceTo(centro);
        const d1 = para.distanceTo(centro);
        if (d0 <= 0 || d1 <= 0 || !Number.isFinite(d1 / d0) || d1 / d0 === 0) {
          return erro(campo, 'deve ligar pontos distintos do centro por uma razão finita');
        }
        pos = aproximacaoExponencial(
          centro, de, para, ritmo(m.ritmoDaDirecao, `${campo}.ritmoDaDirecao`)
        );
        break;
      }
      case 'raspao': {
        const direcaoNoJoelho = ponto(m.direcaoNoJoelho, `${campo}.direcaoNoJoelho`);
        const modulo = direcaoNoJoelho.length();
        if (modulo === 0 || Math.abs(modulo - 1) > 1e-12) {
          return erro(`${campo}.direcaoNoJoelho`, 'deve ser um versor');
        }
        const distanciaMinima = lerNumero(m.distanciaMinima, `${campo}.distanciaMinima`);
        const joelho = fracao(m.joelho, `${campo}.joelho`, lerNumero);
        const sigma = lerNumero(m.sigma, `${campo}.sigma`);
        const alongamento = lerNumero(m.alongamento, `${campo}.alongamento`);
        const chao = fracao(m.chao, `${campo}.chao`, lerNumero);
        const [expoenteDeEntrada, expoenteDeSaida] = par(
          m.expoentes, `${campo}.expoentes`, lerNumero
        );
        if (distanciaMinima <= 0) return erro(`${campo}.distanciaMinima`, 'deve ser positiva');
        if (joelho >= 1) return erro(`${campo}.joelho`, 'deve vir antes do fim');
        if (sigma <= 0) return erro(`${campo}.sigma`, 'deve ser positivo');
        if (alongamento < 0 || alongamento >= 1) {
          return erro(`${campo}.alongamento`, 'deve ficar entre 0 e 1, sem o fim');
        }
        if (expoenteDeEntrada <= 0 || expoenteDeSaida <= 0) {
          return erro(`${campo}.expoentes`, 'devem ser positivos');
        }
        pos = raspao({
          centro: ponto(m.centro, `${campo}.centro`),
          de: ponto(m.de, `${campo}.de`),
          direcaoNoJoelho,
          para: ponto(m.para, `${campo}.para`),
          distanciaMinima, joelho, sigma, alongamento, chao,
          expoenteDeEntrada, expoenteDeSaida,
        });
        break;
      }
      case 'arco': {
        const direcaoDe = ponto(m.direcaoDe, `${campo}.direcaoDe`);
        const direcaoPara = ponto(m.direcaoPara, `${campo}.direcaoPara`);
        for (const [nome, direcao] of [['direcaoDe', direcaoDe], ['direcaoPara', direcaoPara]] as const) {
          const modulo = direcao.length();
          if (modulo === 0 || Math.abs(modulo - 1) > 1e-12) {
            return erro(`${campo}.${nome}`, 'deve ser um versor');
          }
        }
        if (new THREE.Vector3().crossVectors(direcaoDe, direcaoPara).lengthSq() < 1e-24) {
          return erro(campo, 'precisa de duas direções que formem um arco');
        }
        const [raioDe, raioPara] = par(m.raio, `${campo}.raio`, lerNumero);
        if (raioDe <= 0 || raioPara <= 0) return erro(`${campo}.raio`, 'deve ser positivo');
        pos = arcoAxial(
          ponto(m.centro, `${campo}.centro`), direcaoDe, direcaoPara, raioDe, raioPara
        );
        break;
      }
      case 'sequencia': {
        const dados = lista(m.trechos, `${campo}.trechos`);
        if (dados.length < 2) return erro(`${campo}.trechos`, 'deve conter ao menos dois trechos');
        let anterior = 0;
        const trechos = Array.from(dados, (item, i) => {
          const t = objeto(item, `${campo}.trechos[${i}]`);
          const ate = lerNumero(t.ate, `${campo}.trechos[${i}].ate`);
          if (ate <= anterior || ate > 1) {
            return erro(`${campo}.trechos[${i}].ate`, 'deve crescer e terminar no máximo em 1');
          }
          anterior = ate;
          return { ate, pos: lerMovimento(t.movimento, `${campo}.trechos[${i}].movimento`) };
        });
        if (anterior !== 1) return erro(`${campo}.trechos`, 'o último trecho deve terminar em 1');
        pos = sequencia(trechos);
        break;
      }
      default: return erro(`${campo}.tipo`, `desconhecido: ${String(m.tipo)}`);
    }

    const progresso = curvaEscalar(m.progresso, `${campo}.progresso`, true, lerNumero);
    if (progresso) {
      const movimento = pos;
      pos = (k, out) => movimento(progresso(k), out);
    }
    if (m.intervalo !== undefined) {
      const [de, ate] = par(m.intervalo, `${campo}.intervalo`, lerNumero);
      if (de < 0 || ate > 1 || ate <= de) {
        return erro(`${campo}.intervalo`, 'deve crescer dentro de 0 e 1');
      }
      pos = intervalo(pos, de, ate);
    }
    return pos;
  };

  const pos = lerMovimento(p.movimento, 'movimento');

  const o = objeto(p.mira, 'mira');
  let look: PosFn;
  switch (o.tipo) {
    case 'fixo': look = still(ponto(o.ponto, 'mira.ponto')); break;
    case 'pan':
      look = panLook(ponto(o.de, 'mira.de'), ponto(o.para, 'mira.para'), ritmo(o.ritmo, 'mira.ritmo'));
      break;
    case 'pan-cedo':
      look = panThenHold(ponto(o.de, 'mira.de'), ponto(o.para, 'mira.para'), fracao(o.ate, 'mira.ate', lerNumero));
      break;
    case 'pan-direcao':
      look = lookPan(pos, ponto(o.de, 'mira.de'), ponto(o.para, 'mira.para'), fracao(o.ate, 'mira.ate', lerNumero));
      break;
    case 'passagem': {
      const entrada = fracao(o.entrada, 'mira.entrada', lerNumero);
      const saida = fracao(o.saida, 'mira.saida', lerNumero);
      if (saida < entrada) return erro('mira.saida', 'não pode vir antes da entrada');
      look = lookEvento(
        pos, ponto(o.de, 'mira.de'), ponto(o.assunto, 'mira.assunto'),
        ponto(o.rumo, 'mira.rumo'), entrada, saida
      );
      break;
    }
    case 'raspao': {
      const ate = fracao(o.ate, 'mira.ate', lerNumero);
      const joelho = fracao(o.joelho, 'mira.joelho', lerNumero);
      const sigma = lerNumero(o.sigma, 'mira.sigma');
      const alongamento = lerNumero(o.alongamento, 'mira.alongamento');
      const pesoMaximo = lerNumero(o.pesoMaximo, 'mira.pesoMaximo');
      const alcance = lerNumero(o.alcance, 'mira.alcance');
      if (joelho >= 1) return erro('mira.joelho', 'deve vir antes do fim');
      if (sigma <= 0) return erro('mira.sigma', 'deve ser positivo');
      if (alongamento < 0 || alongamento >= 1) {
        return erro('mira.alongamento', 'deve ficar entre 0 e 1, sem o fim');
      }
      if (pesoMaximo <= 0 || pesoMaximo > 1) {
        return erro('mira.pesoMaximo', 'deve ficar entre 0 (exclusivo) e 1');
      }
      if (alcance <= 0) return erro('mira.alcance', 'deve ser positivo');
      look = lookRaspao(
        pos, ponto(o.principal, 'mira.principal'), ponto(o.assunto, 'mira.assunto'),
        ate, joelho, sigma, alongamento, pesoMaximo, alcance
      );
      break;
    }
    default: return erro('mira.tipo', `desconhecido: ${String(o.tipo)}`);
  }

  return {
    dur, pos, look, fov0, fov1,
    ease: ritmo(p.ritmo, 'ritmo'),
    fovEase: ritmo(p.ritmoDaLente, 'ritmoDaLente'),
    roll: curvaEscalar(p.inclinacao, 'inclinacao', false, lerNumero),
    warp: curvaEscalar(p.efeitoDeVelocidade, 'efeitoDeVelocidade', true, lerNumero),
  };
}
