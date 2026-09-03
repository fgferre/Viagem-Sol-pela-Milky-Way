// ============================================================
// A LEGENDA REEMITIDA NA TROCA DE LÍNGUA (item 130/F3, lista do §19).
//
// A regra é `reemitirLegenda`, pura, para ser julgada sem canvas nem
// WebGL — o `director.ts` não abre no runner `node` da casa. Aqui ela
// roda contra o ROTEIRO REAL, simulando os quadros do filme, e o último
// caso confere que o tick do Director de fato a CHAMA, em vez de ter
// uma cópia da comparação escrita à mão.
// ============================================================
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { reemitirLegenda } from './legendaNoAr';

const FONTE = readFileSync(new URL('../director.ts', import.meta.url), 'utf8');

describe('a legenda segue a língua no meio do filme', () => {
  const idioma = () => import('../../lib/idioma');
  afterEach(async () => (await idioma()).definirIdioma('pt-BR'));

  /** o latch do Director, com a MESMA regra que ele usa por quadro */
  function reprodutor(rig: { captionAt: (t: number) => { index: number; key: { caption: string } } }) {
    let ultimoIndex = -1;
    let ultimoTexto = '';
    return (t: number): string | null => {
      const { index, key } = rig.captionAt(t);
      if (!reemitirLegenda(index, key.caption, ultimoIndex, ultimoTexto)) return null;
      ultimoIndex = index;
      ultimoTexto = key.caption;
      return key.caption;
    };
  }

  it('o MESMO instante, com a língua trocada, reemite — e o quadro seguinte cala', async () => {
    const { definirIdioma } = await idioma();
    const { JourneyRig } = await import('../cinematic/cameraRig');
    const { auditarRoteiro } = await import('../cinematic/journey');
    const rig = new JourneyRig();
    const quadro = reprodutor(rig);

    // uma legenda que TEM inglês e cuja janela é longa o bastante para
    // o visitante trocar de idioma no meio dela
    const legenda = auditarRoteiro().captions.find((c) => c.text === 'O MERGULHO')!;
    const t = legenda.t0 + 0.05;

    expect(quadro(t)).toBe('O MERGULHO');
    // o quadro seguinte, mesma língua, mesmo instante: nada a publicar
    expect(quadro(t)).toBeNull();

    definirIdioma('en');
    // MESMO instante, MESMO índice — e mesmo assim vai ao ar
    const emIngles = quadro(t);
    expect(emIngles).not.toBeNull();
    expect(emIngles).not.toBe('O MERGULHO');
    // e agora o latch segura de novo
    expect(quadro(t)).toBeNull();

    // voltar ao português reemite outra vez
    definirIdioma('pt-BR');
    expect(quadro(t)).toBe('O MERGULHO');
  });

  it('trocar de língua NÃO reemite uma legenda de NOME PRÓPRIO — nada a publicar', async () => {
    // a contraprova: a regra não é "reemite sempre que a língua muda",
    // é "reemite quando a FRASE muda". SIRIUS se escreve igual nas duas.
    const { definirIdioma } = await idioma();
    const { JourneyRig } = await import('../cinematic/cameraRig');
    const { auditarRoteiro } = await import('../cinematic/journey');
    const rig = new JourneyRig();
    const quadro = reprodutor(rig);
    const legenda = auditarRoteiro().captions.find((c) => c.text === 'SIRIUS')!;
    const t = legenda.t0 + 0.05;
    expect(quadro(t)).toBe('SIRIUS');
    definirIdioma('en');
    expect(quadro(t)).toBeNull();
  });

  it('e o Director USA essa regra — não uma cópia dela no tick', () => {
    // a regra é uma só: o tick chama a função, e o `if` que comparava
    // índice à mão não voltou por baixo do pano
    expect(FONTE).toContain(
      'if (reemitirLegenda(index, key.caption, this.lastCaptionIdx, this.lastCaptionTexto))'
    );
    expect(FONTE).not.toContain('index !== this.lastCaptionIdx');
  });
});
