// ============================================================
// O oráculo do cadastro de escala. Três coisas, e a terceira é a que
// dá valor às outras duas:
//
//  1. ESPELHOS — os números que moram em arquivos que importam three
//     entram no cadastro copiados; aqui se confere a cópia contra a
//     fonte, por varredura TEXTUAL (o molde de `selo.test.ts`). Uma
//     casa decimal movida do outro lado quebra o teste, não a tela.
//
//  2. COMPLETUDE — todo arquivo que CONFESSA escala artística num
//     comentário tem de ter entrada no cadastro. É o que impede a
//     próxima escala inventada de nascer calada, que foi exatamente
//     como a do Sol nasceu.
//
//  3. A REGRA + a dívida — corpo (escreve profundidade) tem de ter
//     fator 1; quem não tem, tem de ter a fase que paga escrita em
//     `DIVIDAS_ABERTAS`. A F3 ENTROU (2026-08-13): a entrada do Sol saiu
//     da tabela e o oráculo apertou sozinho — o cadastro agora EXIGE
//     fator 1 do Sol, sem ninguém lembrar de apertá-lo. Falta a F5.
//
// PROVA DE SABOTAGEM (a exigência que separa gate de decoração): cada
// varredura e cada regra tem um caso que a sabota de propósito e cobra
// vermelho. Uma varredura com o padrão podre passa calada, e foi assim
// que o registro do doador envelheceu mentindo.
// ============================================================
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  CADASTRO_DE_ESCALA,
  DIVIDAS_ABERTAS,
  ESPELHO_ESCALA_COMPLEXO,
  ESPELHO_ESCALA_NUVEM_CO,
  ESPELHO_RS_SGR_A_PC,
  MASSA_SGR_A_MSOL,
  RAIO_ARTISTICO_DO_SOL_PC,
  RAIO_DO_SOL_NA_CENA,
  RAIO_SOL_KM,
  RAIO_SOL_PC,
  DIVIDAS_DE_BRILHO,
  acusacaoDaEscala,
  acusacaoDoBrilho,
  brilhoEmTexto,
  culpadosDaEscala,
  culpadosDoBrilho,
  deveDivida,
  deveDividaDeBrilho,
  fatorEmTexto,
  kmParaPc,
  raioDeSchwarzschildPc,
  type EscalaDeclarada,
} from './escala';
import { SOBRETAXA_DO_HALO } from './luzDaCasa';
import { FRACAO_DA_ASA } from './estrela';

const ler = (caminhoDoRepo: string) =>
  readFileSync(new URL(`../../${caminhoDoRepo}`, import.meta.url), 'utf8');

/** o arquivo de um endereço "src/a/b.ts:12" */
const arquivoDe = (endereco: string) => endereco.split(':')[0];

// ------------------------------------------------------------
describe('1. os espelhos batem com a fonte', () => {
  it('RS de Sgr A✱ — world/blackHole.ts', () => {
    const m = ler('src/three/world/blackHole.ts').match(/const RS_PC = ([\d.]+);/);
    expect(m, 'a varredura do RS_PC perdeu o padrão').not.toBeNull();
    expect(Number(m![1])).toBe(ESPELHO_RS_SGR_A_PC);
  });

  // (O espelho do coeficiente do clarão — `0,08 * lum` em heroStars.ts —
  // morreu no M2 com o clarão de autor: o tamanho é lei (asa Moffat,
  // estrela.ts), e a varredura INVERTIDA vigia a ressurreição do
  // coeficiente em simbolosProibidos.test.ts.)

  it('escalas das nuvens — world/observedClouds.ts', () => {
    const fonte = ler('src/three/world/observedClouds.ts');
    const co = fonte.match(/const CO_RADIUS_SCALE = ([\d.]+);/);
    const grande = fonte.match(/const LARGE_RADIUS_SCALE = ([\d.]+);/);
    expect(co, 'a varredura de CO_RADIUS_SCALE perdeu o padrão').not.toBeNull();
    expect(grande, 'a varredura de LARGE_RADIUS_SCALE perdeu o padrão').not.toBeNull();
    expect(Number(co![1])).toBe(ESPELHO_ESCALA_NUVEM_CO);
    expect(Number(grande![1])).toBe(ESPELHO_ESCALA_COMPLEXO);
  });

  it('a massa de Sgr A✱ é a que o cabeçalho do shader declara', () => {
    // "(4,15e6 M☉)" no comentário — vírgula decimal, como a casa escreve
    expect(ler('src/three/world/blackHole.ts')).toContain('4,15e6 M☉');
    expect(MASSA_SGR_A_MSOL).toBe(4.15e6);
  });

  it('o raio do Sol NÃO é espelho: sai de RAIO_DO_SOL_NA_CENA, a fonte única', () => {
    // até a F3 saía de `WORLD.sunRadius`; o raio mudou de casa junto com
    // o cadastro que o declara, e o fator continua DERIVADO do que a
    // cena desenha — nunca um `1` digitado.
    const sol = CADASTRO_DE_ESCALA.find((e) => e.id === 'sol')!;
    expect(sol.fator).toBe(RAIO_DO_SOL_NA_CENA / RAIO_SOL_PC);
    expect(sol.fator).toBe(1);
    expect(RAIO_DO_SOL_NA_CENA).toBe(RAIO_SOL_PC);
  });
});

// ------------------------------------------------------------
describe('2. completude — quem confessa tem de estar no cadastro', () => {
  // Os arquivos que a casa já sabe que inventam escala. A varredura
  // abaixo os REDESCOBRE pelo texto; esta lista existe só para provar
  // que ela funciona (o defeito clássico: padrão podre, zero achados,
  // teste verde).
  const CONFESSAM = [
    'src/three/config.ts',
    'src/three/escala.ts',
    'src/three/world/blackHole.ts',
    'src/three/world/observedClouds.ts',
  ];

  const VARREDURA = /art[íi]stic[ao]/i;

  it('a varredura acha confissão de verdade — um padrão quebrado passaria calado', () => {
    for (const arquivo of CONFESSAM) {
      expect(VARREDURA.test(ler(arquivo)), `a varredura perdeu ${arquivo}`).toBe(true);
    }
  });

  it('todo arquivo que confessa escala artística tem entrada, ou aponta para ela', () => {
    // A REGRA GANHOU UMA SEGUNDA PERNA NA F3, e a razão é uma lápide: o
    // `config.ts` continua confessando (ele guarda por escrito que
    // hospedou o raio inflado de 0,011 pc até 2026-08-13), mas o número
    // saiu de lá. Exigir dele uma ENTRADA seria exigir que o cadastro
    // apontasse para um endereço que não tem mais nada — a mentira de
    // procedência que este arquivo existe para impedir. Quem confessa e
    // não tem entrada tem de DIZER onde a entrada está.
    const cadastrados = new Set(CADASTRO_DE_ESCALA.map((e) => arquivoDe(e.endereco)));
    for (const arquivo of CONFESSAM) {
      const apontaParaOCadastro = ler(arquivo).includes('src/three/escala.ts');
      expect(
        cadastrados.has(arquivo) || apontaParaOCadastro,
        `${arquivo} confessa escala artística, não tem entrada em CADASTRO_DE_ESCALA `
          + 'e não aponta para o cadastro'
      ).toBe(true);
    }
  });

  it('SABOTAGEM — um arquivo que confessa e não aponta para lugar nenhum reprova', () => {
    // sem esta ponta, a perna nova da regra seria só uma porta aberta
    const cadastrados = new Set(CADASTRO_DE_ESCALA.map((e) => arquivoDe(e.endereco)));
    const inventado = 'src/three/world/nebula.ts'; // não está no cadastro
    expect(cadastrados.has(inventado)).toBe(false);
    expect(ler(inventado).includes('src/three/escala.ts')).toBe(false);
  });

  it('todo endereço do cadastro aponta para arquivo que existe', () => {
    for (const e of CADASTRO_DE_ESCALA) {
      expect(() => ler(arquivoDe(e.endereco)), `${e.id}: ${e.endereco}`).not.toThrow();
    }
  });

  it('nenhuma entrada sem razão escrita — o cadastro não aceita adjetivo vazio', () => {
    for (const e of CADASTRO_DE_ESCALA) {
      expect(e.razao.length, `${e.id} sem razão`).toBeGreaterThan(30);
      expect(e.nome.length, `${e.id} sem nome`).toBeGreaterThan(0);
    }
  });

  it('ids únicos', () => {
    const ids = CADASTRO_DE_ESCALA.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ------------------------------------------------------------
describe('3. a regra: quem escreve profundidade tem raio real', () => {
  it('todo corpo em dívida tem a fase que a paga escrita', () => {
    for (const e of CADASTRO_DE_ESCALA.filter(deveDivida)) {
      expect(
        DIVIDAS_ABERTAS[e.id],
        `${e.id} está em dívida e não tem fase declarada em DIVIDAS_ABERTAS`
      ).toBeTruthy();
    }
  });

  it('nenhuma dívida órfã — entrada que sobra vira mentira ao contrário', () => {
    const emDivida = new Set(CADASTRO_DE_ESCALA.filter(deveDivida).map((e) => e.id));
    for (const id of Object.keys(DIVIDAS_ABERTAS)) {
      expect(
        emDivida.has(id),
        `${id} tem dívida declarada mas o cadastro diz que o fator já é 1 — apague a entrada`
      ).toBe(true);
    }
  });

  it('instrumento nunca entra na acusação — ele é óptica, não corpo', () => {
    for (const e of culpadosDaEscala()) expect(e.classe).toBe('corpo');
  });

  // PROVA DE SABOTAGEM: sem ela as três acima são decoração.
  it('SABOTAGEM — um corpo inflado sem dívida declarada TEM de reprovar', () => {
    const sabotado: EscalaDeclarada = {
      id: 'planeta-x',
      nome: 'Planeta X',
      classe: 'corpo',
      fator: 12,
      fatorDeBrilho: 1,
      endereco: 'src/three/config.ts:9',
      razao: 'inflado de propósito para provar que o gate morde de verdade',
    };
    expect(deveDivida(sabotado)).toBe(true);
    expect(DIVIDAS_ABERTAS[sabotado.id]).toBeUndefined();
  });

  it('SABOTAGEM — corpo que não sabe o próprio raio real também deve dívida', () => {
    const semReal: EscalaDeclarada = {
      id: 'corpo-sem-medida',
      nome: 'corpo sem medida',
      classe: 'corpo',
      fator: null,
      fatorDeBrilho: 1,
      endereco: 'src/three/config.ts:9',
      razao: 'um corpo que não sabe o próprio tamanho é pior que um que sabe e mente',
    };
    expect(deveDivida(semReal)).toBe(true);
  });

  it('um corpo honesto (fator 1) sai da acusação sozinho', () => {
    const honesto: EscalaDeclarada = {
      id: 'terra',
      nome: 'Terra',
      classe: 'corpo',
      fator: 1,
      fatorDeBrilho: 1,
      endereco: 'src/three/world/corpos/terra.ts:98',
      razao: 'raio equatorial do kernel da NASA, sem fator nenhum — a régua da casa',
    };
    expect(deveDivida(honesto)).toBe(false);
  });
});

// ------------------------------------------------------------
describe('3b. A SEGUNDA COLUNA: a mesma regra, para brilho', () => {
  // As TRÊS PERNAS que a coluna de tamanho já tem — espelho, completude e
  // sabotagem. Abrir a coluna sem elas repetiria, com outro nome, o defeito
  // que a deixou existir: o vão de 26 magnitudes da fotosfera nasceu calado
  // porque não havia onde declará-lo NEM quem cobrasse a declaração.

  it('PERNA 1 (espelho) — o Sol EMITE NA UNIDADE DA CASA, e não deve mais brilho', () => {
    // a coluna nasceu declarando 3,7e-11 (~26 magnitudes de menos luz): a
    // malha emitia a paleta H-alfa autorada enquanto o ponto depositava
    // ~2,7e10 para a MESMA superfície. A F2 entrou em 15/08 — a fotosfera
    // passou a emitir a radiância verdadeira pela ponte de unidades — e o
    // oráculo apertou sozinho: agora ele EXIGE 1.
    const sol = CADASTRO_DE_ESCALA.find((e) => e.id === 'sol')!;
    expect(sol.fatorDeBrilho).toBe(1);
    expect(deveDividaDeBrilho(sol)).toBe(false);
    // e a linha do Sol saiu do placar: dívida quitada não fica declarada,
    // senão a PERNA 2 (nenhuma dívida órfã) vira decoração
    expect(DIVIDAS_DE_BRILHO.sol).toBeUndefined();
  });

  it('PERNA 1 (espelho) — a sobretaxa do halo é a MEDIDA em luzDaCasa.test.ts', () => {
    const halo = CADASTRO_DE_ESCALA.find((e) => e.id === 'halo-da-psf')!;
    expect(halo.fatorDeBrilho).toBe(SOBRETAXA_DO_HALO);
    expect(halo.classe).toBe('instrumento');
  });

  it('PERNA 2 (completude) — todo corpo em dívida de brilho tem fase escrita', () => {
    for (const e of CADASTRO_DE_ESCALA.filter(deveDividaDeBrilho)) {
      expect(
        DIVIDAS_DE_BRILHO[e.id],
        `${e.id} deve brilho e não tem fase declarada em DIVIDAS_DE_BRILHO`
      ).toBeTruthy();
    }
  });

  it('PERNA 2 (completude) — nenhuma dívida de brilho órfã', () => {
    const emDivida = new Set(CADASTRO_DE_ESCALA.filter(deveDividaDeBrilho).map((e) => e.id));
    for (const id of Object.keys(DIVIDAS_DE_BRILHO)) {
      expect(
        emDivida.has(id),
        `${id} tem dívida de brilho declarada mas o cadastro já diz que emite certo`
      ).toBe(true);
    }
  });

  it('PERNA 3 (SABOTAGEM) — corpo que emite errado sem dívida declarada REPROVA', () => {
    const sabotado: EscalaDeclarada = {
      id: 'estrela-x',
      nome: 'Estrela X',
      classe: 'corpo',
      fator: 1,
      fatorDeBrilho: 1e6,
      endereco: 'src/three/config.ts:9',
      razao: 'emitindo um milhão de vezes a mais, de propósito, para o gate morder',
    };
    expect(deveDividaDeBrilho(sabotado)).toBe(true);
    expect(DIVIDAS_DE_BRILHO[sabotado.id]).toBeUndefined();
  });

  it('PERNA 3 (SABOTAGEM) — corpo que não sabe o próprio brilho também deve', () => {
    const semMedida: EscalaDeclarada = {
      id: 'corpo-sem-luz',
      nome: 'corpo sem luz medida',
      classe: 'corpo',
      fator: 1,
      fatorDeBrilho: null,
      endereco: 'src/three/config.ts:9',
      razao: 'um corpo que não sabe quanto emite é pior que um que sabe e mente',
    };
    expect(deveDividaDeBrilho(semMedida)).toBe(true);
  });

  it('instrumento nunca entra na acusação de brilho — é óptica declarada', () => {
    for (const e of culpadosDoBrilho()) expect(e.classe).toBe('corpo');
    // o halo, o clarão, o ponto-zero e as partículas ficam no cadastro aberto
    for (const id of ['halo-da-psf', 'ponto-zero-do-campo', 'galaxia-particulas']) {
      expect(CADASTRO_DE_ESCALA.find((e) => e.id === id)!.classe).toBe('instrumento');
    }
  });

  it('A COLUNA DE TAMANHO NÃO SENTIU NADA — duas máquinas, não um if a mais', () => {
    // é o contrato desta onda: acrescentar a coluna não pode mexer no que o
    // selo já diz. Se esta linha mudar, a F1 vazou.
    expect(acusacaoDaEscala()).toEqual(['Sagittarius A✱ está 125.884× maior']);
  });

  it('a acusação de brilho fala em magnitudes quando o número é grande demais', () => {
    // "3,7e-11×" não diz nada a ninguém; "26,1 magnitudes de menos luz" diz.
    expect(brilhoEmTexto(1)).toBe('na unidade da casa');
    expect(brilhoEmTexto(null)).toBe('brilho de autor');
    expect(brilhoEmTexto(2)).toBe('2,0× mais luz');
    expect(brilhoEmTexto(0.5)).toBe('2,0× menos luz');
    expect(brilhoEmTexto(1e-11)).toMatch(/magnitudes de menos luz/);
    // o SOL SAIU da acusação em 15/08, com a F2 — quem sobra é o buraco
    // negro, cuja emissão é autorada e não tem contraparte medida. Um selo
    // que acusasse quem já pagou é tão desonesto quanto um que cala sobre
    // quem deve.
    const linhas = acusacaoDoBrilho();
    expect(linhas.some((l) => l.startsWith('Sol emite'))).toBe(false);
    expect(linhas).toEqual(['Sagittarius A✱ emite brilho de autor']);
  });
});

// ------------------------------------------------------------
describe('4. os números, pinados', () => {
  it('o raio do Sol em pc é o que o config.ts:8 chamou de invisível', () => {
    expect(RAIO_SOL_PC).toBeCloseTo(2.256684e-8, 14);
    expect(kmParaPc(RAIO_SOL_KM)).toBe(RAIO_SOL_PC);
  });

  it('o Sol da cena está no tamanho certo — e o 487.441× fica no registro', () => {
    const sol = CADASTRO_DE_ESCALA.find((e) => e.id === 'sol')!;
    expect(sol.fator).toBe(1);
    expect(Math.round(RAIO_ARTISTICO_DO_SOL_PC / RAIO_SOL_PC)).toBe(487_441);
  });

  it('Sgr A✱ está 125.884× maior, e o real SAI DA MASSA', () => {
    const bh = CADASTRO_DE_ESCALA.find((e) => e.id === 'sgr-a')!;
    expect(raioDeSchwarzschildPc(MASSA_SGR_A_MSOL)).toBeCloseTo(3.971895e-7, 13);
    expect(Math.round(bh.fator!)).toBe(125_884);
  });

  it('o clarão das estrelas declara a LEI, não um fator de autor (M2)', () => {
    // O "~5,7 milhões de vezes o raio de Sirius" era o coeficiente de
    // autor 0,08·10^(−0,3m) — morreu no M2. O tamanho agora é px pela
    // asa Moffat, então a entrada declara `fator: null` (não há razão
    // única a declarar) e o fatorDeBrilho da asa explícita (1,06 =
    // 1 + FRACAO_DA_ASA, a partição de energia da Lei §1).
    const clarao = CADASTRO_DE_ESCALA.find((e) => e.id === 'clarao-estelar')!;
    expect(clarao.fator).toBeNull();
    expect(clarao.fatorDeBrilho).toBeCloseTo(1 + FRACAO_DA_ASA, 12);
    expect(clarao.classe).toBe('instrumento');
    expect(clarao.endereco).toContain('clarao.ts');
  });

  it('a acusação vai do pior para o melhor', () => {
    const f = culpadosDaEscala().map((e) => e.fator!);
    expect(f).toEqual([...f].sort((a, b) => b - a));
  });
});

// ------------------------------------------------------------
describe('5. a copy que o visitante lê', () => {
  it('fator em pt-BR: milhar com ponto, decimal com vírgula', () => {
    expect(fatorEmTexto(487_441)).toBe('487.441×');
    expect(fatorEmTexto(2.1)).toBe('2,1×');
    expect(fatorEmTexto(1.2)).toBe('1,2×');
  });

  it('fator ausente vira palavra honesta, nunca número inventado', () => {
    expect(fatorEmTexto(null)).toBe('raio de autor');
    expect(fatorEmTexto(NaN)).toBe('raio de autor');
    expect(fatorEmTexto(Infinity)).toBe('raio de autor');
  });

  it('a acusação nomeia o culpado e o fator — e sobrou UM depois da F3', () => {
    const linhas = acusacaoDaEscala();
    expect(linhas).toEqual(['Sagittarius A✱ está 125.884× maior']);
    // com o raio que a casa desenhava até 2026-08-13 eram DOIS, e o Sol
    // vinha primeiro (a ordem é do pior fator para o melhor)
    const antes = acusacaoDaEscala(RAIO_ARTISTICO_DO_SOL_PC);
    expect(antes).toEqual([
      'Sol está 487.441× maior',
      'Sagittarius A✱ está 125.884× maior',
    ]);
  });
});

// ------------------------------------------------------------
describe('6. F1/F3 — a acusação com o raio VIVO do Sol', () => {
  it('com o raio FÍSICO o Sol sai da acusação — o selo não acusa quem pagou', () => {
    const linhas = acusacaoDaEscala(RAIO_SOL_PC);
    expect(linhas.some((l) => l.startsWith('Sol '))).toBe(false);
    // e Sgr A✱ continua devendo: pagar uma dívida não perdoa a outra
    expect(linhas).toEqual(['Sagittarius A✱ está 125.884× maior']);
  });

  it('sem argumento, fala pelo padrão da casa — que desde a F3 é o raio REAL', () => {
    expect(acusacaoDaEscala()).toEqual(acusacaoDaEscala(RAIO_DO_SOL_NA_CENA));
    expect(acusacaoDaEscala()).toEqual(['Sagittarius A✱ está 125.884× maior']);
    // e a acusação ANTIGA continua reproduzível: passando o raio que a
    // casa desenhava até 2026-08-13, o Sol volta à lista. É a prova de
    // que a fase pagou uma dívida em vez de apagar o cobrador.
    expect(acusacaoDaEscala(RAIO_ARTISTICO_DO_SOL_PC)[0]).toBe('Sol está 487.441× maior');
  });

  it('o fator do Sol acompanha o raio vivo, em qualquer valor', () => {
    const meio = culpadosDaEscala(RAIO_SOL_PC * 3).find((e) => e.id === 'sol')!;
    expect(meio.fator).toBeCloseTo(3, 10);
  });

  it('AGULHA: um Sol real ainda em dívida seria contradição — e não é', () => {
    // se algum dia `deveDivida` deixar de comparar com 1 exato, isto pega
    expect(culpadosDaEscala(RAIO_SOL_PC).some((e) => e.id === 'sol')).toBe(false);
  });
});
