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
