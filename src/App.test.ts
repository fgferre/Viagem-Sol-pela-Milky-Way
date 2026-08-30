// Serve: chão — ?loader= só arma atrás do ?shot= e nunca vaza no link copiado; a lista de reservas dos rótulos cobre o HUD fixo
// Mordida: justificada — pina dois defeitos pontuais de um componente de ~1.100 linhas; o comportamento largo do App é dos juízes de navegador (a11y, atlas-smoke), e sabotagem fora dos pinos não é deste arquivo
// ============================================================
// App.tsx por texto-fonte — o App é DOM de ponta a ponta e o runner da
// casa é `node`, então o que ele decide se pina aqui como a "fiação no
// director" de terra.test.ts: lendo a fonte, nunca montando o React.
//
// A LEI DE `?loader=` (auditoria item 4): a porta fixa uma etapa da
// tela de carregamento COM O VÉU POR CIMA, para sempre — ela é
// ferramenta de captura, e captura anda com `?shot=`. Fora disso ela
// era uma armadilha dupla: um link de visita com `?loader=` prendia o
// véu preto sobre a cena, e o "copiar link" PROPAGAVA o parâmetro para
// quem recebesse.
// ============================================================
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const FONTE = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
// o urlComMomento mudou de casa no corte 6 da onda da arquitetura — o
// pino do "copiar link" segue a função para o hook do espelho da URL
const ESPELHO = readFileSync(
  new URL('./hooks/useEspelhoDaUrl.ts', import.meta.url),
  'utf8'
);

describe('?loader= é ferramenta de captura (auditoria item 4)', () => {
  it('só é honrado com ?shot= presente — sem ele, nem se lê o valor', () => {
    // a guarda vem ANTES do find no inicializador de `loaderFixo`
    const inicio = FONTE.indexOf("if (!q.has('shot')) return null;");
    const find = FONTE.indexOf("LOAD_STAGES.find((s) => s.id === q.get('loader'))");
    expect(inicio).toBeGreaterThan(0);
    expect(find).toBeGreaterThan(inicio);
  });

  it('o link copiado NUNCA propaga loader — urlComMomento o apaga na entrada', () => {
    // o delete mora no próprio urlComMomento, antes de qualquer retorno
    // (inclusive o `if (!d) return url` do boot sem Director)
    const funcao = ESPELHO.indexOf('const urlComMomento = ');
    const apaga = ESPELHO.indexOf("url.searchParams.delete('loader')");
    const semDirector = ESPELHO.indexOf('if (!d) return url;');
    expect(funcao).toBeGreaterThan(0);
    expect(apaga).toBeGreaterThan(funcao);
    expect(apaga).toBeLessThan(semDirector);
  });
});

// ============================================================
// O QUE OS RÓTULOS CONTORNAM (item 56, 2026-08-20). A régua do defeito
// do dono não é o desenho — esse já sabia ceder (`LabelCanvas.test.ts`)
// — é a LISTA: o App reservava os diálogos e mais nada, então o HUD
// fixo não existia para o canvas. O que se pina aqui é que a lista cita
// as peças que trocam de arranjo, e que ela é a MESMA usada para medir
// e para observar: duas listas discordariam na primeira peça nova.
// ============================================================
describe('a reserva dos rótulos cobre o HUD fixo (item 56)', () => {
  const LISTA = FONTE.slice(
    FONTE.indexOf('const AREAS_RESERVADAS = ['),
    FONTE.indexOf("].join(', ');")
  );

  it('cita o rodapé, o selo e as tarjas — o HUD do flagrante', () => {
    expect(LISTA).toContain("':scope > [data-dialogo]'");
    for (const peca of [
      '.atlas-rodape',
      '.atlas-selo',
      '.filme-rodape',
    ]) {
      expect(LISTA, peca).toContain(`'${peca}'`);
    }
  });

  it('da barra reserva os CONTROLES, nunca a caixa com o vão da quebra', () => {
    expect(LISTA).toContain("'.controls-bar > *'");
    // a caixa sozinha apagava nome a 290 px do botão mais próximo
    expect(LISTA).not.toContain("'.controls-bar',");
  });

  it('quem MEDE e quem OBSERVA leem a mesma lista', () => {
    expect(FONTE).toContain('root.querySelectorAll(AREAS_RESERVADAS)]');
    expect(FONTE).toContain(
      'for (const e of root.querySelectorAll(AREAS_RESERVADAS)) observador.observe(e);'
    );
    // e a barra é a ÚNICA exceção declarada: observada sem ser reservada,
    // porque a quebra de linha move os controles sem redimensioná-los
    expect(FONTE).toContain('if (barra) observador.observe(barra);');
  });

  it('caixa vazia não vira retângulo — em ?shot=2 todo o HUD é display:none', () => {
    expect(FONTE).toContain('.filter((b) => b.width > 0 && b.height > 0)');
  });
});
