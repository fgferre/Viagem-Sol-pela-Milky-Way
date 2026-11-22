// Serve: chão — a conta do Avançado e o veredito do selo do juiz de a11y reprovam o que devem, sem subir Chrome
// As contas PURAS do juiz de a11y (destravar, 21/11/2026). O juiz inteiro
// abre o app e não roda aqui; o que decide os dois vereditos roda. Cada um
// tem o seu CONTROLE NEGATIVO, no molde de `memoria.test.mjs`.
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { contarAvancadoNaFonte, julgarAvancado, julgarSelo } from './a11y.mjs';

/** um Avançado com `n` linhas próprias e o laboratório aninhado dentro,
 *  com a linha-modelo do `.map` dele (a que a conta antiga contava) */
const fonteDoAvancado = (n, { linhasDepoisDoLab = 0 } = {}) => [
  '<Sanfona id="ajustes-avancado" aberta={a}>',
  ...Array.from({ length: n - linhasDepoisDoLab }, (_, i) => `  <LinhaDeAjuste id="a${i}" />`),
  '  <Sanfona id="ajustes-laboratorio" aberta={l}>',
  '    {controles.map((c) => (<LinhaDeAjuste key={c.id} />))}',
  '  </Sanfona>',
  ...Array.from({ length: linhasDepoisDoLab }, (_, i) => `  <LinhaDeAjuste id="d${i}" />`),
  '</Sanfona>',
  '<LinhaDeAjuste id="fora" />',
].join('\n');

const gaveta = (abertoDepois) => ({
  expandidoAntes: 'false', fechadoAntes: 0, expandidoDepois: 'true', abertoDepois, fechadoDeNovo: 0,
});

describe('a conta do Avançado', () => {
  it('não conta a linha-modelo do laboratório aninhado, antes ou depois dele', () => {
    expect(contarAvancadoNaFonte(fonteDoAvancado(10))).toBe(10);
    expect(contarAvancadoNaFonte(fonteDoAvancado(10, { linhasDepoisDoLab: 2 }))).toBe(10);
  });

  it('o Ajustes.tsx de hoje tem 10 — um ajuste que some da fonte (10 → 9) reprova aqui', () => {
    // Número escrito de propósito: o juiz lê o esperado da fonte, então um
    // ajuste apagado do Ajustes.tsx baixaria os dois lados juntos e passaria
    // lá. Quem acrescenta ou tira um ajuste de verdade muda este 10.
    const fonte = readFileSync(new URL('../../src/components/Ajustes.tsx', import.meta.url), 'utf8');
    expect(contarAvancadoNaFonte(fonte)).toBe(10);
  });

  it('com 10 na fonte, o DOM com 10 passa e com 9 ou 11 reprova', () => {
    expect(julgarAvancado(gaveta(10), 10).ok).toBe(true);
    expect(julgarAvancado(gaveta(9), 10).ok).toBe(false);
    expect(julgarAvancado(gaveta(11), 10).ok).toBe(false);
    expect(julgarAvancado(gaveta(9), 10).texto).toContain('abre os 10 (achado 9)');
  });
});

describe('o veredito do selo', () => {
  // números inventados para o teste — não são a causa dos 7995 ms, que segue sem prova
  const registro = { t0: 1, depoisDoSet: 5, domMs: 1490, longas: [[20, 1400]] };

  it('a regra é a de sempre: abaixo de 1000 ms passa, acima ou sem texto reprova', () => {
    expect(julgarSelo(12, registro).ok).toBe(true);
    expect(julgarSelo(7995, registro).ok).toBe(false);
    expect(julgarSelo(null, registro).ok).toBe(false);
  });

  it('a reprovação traz o registro da página: setQuality, texto no DOM e as tarefas longas', () => {
    const { ok, texto } = julgarSelo(1500, registro);
    expect(ok).toBe(false);
    expect(texto).toContain('(1500 ms;');
    expect(texto).toContain('setQuality 5 ms');
    expect(texto).toContain('texto no DOM aos 1490 ms');
    expect(texto).toContain('1400 ms aos 20 ms');
  });

  it('sem tarefa longa diz "nenhuma"; sonda quebrada diz que o registro faltou, sem mudar a regra', () => {
    expect(julgarSelo(9, { ...registro, domMs: 8, longas: [] }).texto).toContain('tarefas longas: nenhuma');
    const semRegistro = julgarSelo(9, null);
    expect(semRegistro.ok).toBe(true);
    expect(semRegistro.texto).toContain('registro da página indisponível');
  });
});
