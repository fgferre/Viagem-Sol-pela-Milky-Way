// Serve: chão — a fileira de cinco alças do celular com a alça do Tempo
// da opção Q (A1, rodada 3, escolhida pelo dono em 21/11), e o "Filmes"
// do topo que vira só ícone onde a palavra não cabe (saída B)
// ============================================================
// O runner da casa é `node`, sem DOM: a régua é a de `Ajuda.test.ts` e
// `FichaDoObjeto.test.ts`, que leem o FONTE em vez de renderizar. O que
// a tela mede de verdade (60 situações: 320/360/390 px, `ui` 1 e 1,4, PT
// e EN, os estados) mora na prova por imagem da rodada, não aqui.
// ============================================================
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PT } from '../lib/idioma/pt';
import { EN } from '../lib/idioma/en';

const FONTE = readFileSync(new URL('./HudDoAtlas.tsx', import.meta.url), 'utf8');
const ICONES = readFileSync(new URL('./Icone.tsx', import.meta.url), 'utf8');
const CELULAR = readFileSync(new URL('../hud/09-celular.css', import.meta.url), 'utf8');
const BARRA = readFileSync(new URL('./BarraOuAlcas.tsx', import.meta.url), 'utf8');

describe('a fileira do celular tem cinco colunas iguais', () => {
  it('`minmax(0, 1fr)`: o piso do `1fr` no conteúdo alargava a coluna do Tempo', () => {
    const fileira = CELULAR.slice(CELULAR.indexOf('  .atlas-alcas {'));
    expect(fileira.slice(0, fileira.indexOf('}'))).toContain('grid-template-columns: repeat(5, minmax(0, 1fr));');
    // nenhuma alça redesenha a própria grade por dentro
    expect(CELULAR).not.toMatch(/\.alca-tempo\s*\{[^}]*grid-template-columns/);
  });
});

describe('a alça do Tempo diz o estado por ícone, e o instante por rótulo', () => {
  const alca = FONTE.slice(FONTE.indexOf('export function BotaoDoTempo('), FONTE.indexOf('export function BotaoDaGaveta('));
  const simbolo = FONTE.slice(FONTE.indexOf('function simboloDoTempo('), FONTE.indexOf('export function BotaoDoTempo('));

  it('um ícone do conjunto por estado, e nenhuma palavra de estado escrita na tela', () => {
    const nomes = [...simbolo.matchAll(/return [^;]*?'(\w+)'(?: : '(\w+)')?;/g)].flatMap((m) => m.slice(1)).filter(Boolean);
    expect(nomes).toEqual(['espera', 'alerta', 'aoVivo', 'pausa', 'recuar', 'avancar']);
    for (const nome of nomes) expect(ICONES, nome).toContain(`| '${nome}'`);
    expect(alca).toContain('<Icone nome={simboloDoTempo(tempo)}');
    expect(alca).not.toMatch(/>\s*\{estado\}\s*</);
  });

  it('o nome acessível é estável (só o estado) e o title leva a hora, nas duas línguas', () => {
    expect(alca).toContain("aria-label={t('relogio.alca', { estado })}");
    expect(alca).toContain("title={t('relogio.alcaTitulo', { estado, instante: instanteNaAlca })}");
    for (const texto of [PT['relogio.alca'], EN['relogio.alca']]) {
      expect(texto).toContain('{estado}');
      expect(texto).not.toContain('{instante}');
    }
    for (const texto of [PT['relogio.alcaTitulo'], EN['relogio.alcaTitulo']]) {
      expect(texto).toContain('{estado}');
      expect(texto).toContain('{instante}');
    }
  });
});

describe('o "Filmes" do topo do celular vira só ícone onde a palavra não cabe (saída B)', () => {
  it('a palavra sai só com tela estreita E texto grande, e o nome acessível continua a palavra', () => {
    // um jeito só de compactar: a regra de Voo livre, que poupa quem tem `data-com-palavra`
    expect(CELULAR).toContain('[data-so-icones] .hud-btn:not([data-com-palavra]) > span {');
    expect(CELULAR).not.toContain('.filme-mais-gatilho > span');
    const gatilho = BARRA.slice(BARRA.indexOf('const gatilhoDosFilmes'), BARRA.indexOf('</button>', BARRA.indexOf('const gatilhoDosFilmes')));
    expect(gatilho).toContain("data-com-palavra={larguraEstreita && textoGrande ? undefined : ''}");
    expect(gatilho).toContain("aria-label={alcas ? t('barra.maisFilmes') : undefined}");
  });
});
