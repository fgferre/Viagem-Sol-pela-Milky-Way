// ============================================================
// FOCO NO FECHAMENTO LÓGICO, NÃO NA PRESENÇA (E2, reauditoria de motion,
// PLANO-MOTION-UI.md §12.5 C1.2) — o runner da casa é `node`, sem DOM
// (`vitest.config.ts`): um diálogo de verdade não se monta aqui, e por
// isso o arquivo lê o FONTE em vez de renderizar, a mesma régua de
// `components/FichaDoObjeto.test.ts`/`Ajuda.test.ts`.
//
// O que se prova aqui é a FORMA do reparo, não o pixel: antes, o efeito
// que prende e devolve o foco era um `useEffect` amarrado à PRESENÇA
// (`montada`), então a devolução só corria na desmontagem, no fim da
// animação de saída — nesse meio-tempo o painel ficava inert com o foco
// ainda preso, e o navegador o empurrava para o `<body>` (medido:
// `<body>` ~40–130 ms após Esc). Agora é `useLayoutEffect` (roda ANTES
// da pintura) amarrado ao FECHAMENTO LÓGICO, e a troca A → B no mesmo
// commit não deixa a saída de A roubar de volta o foco que B acabou de
// tomar.
// ============================================================
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const FONTE = readFileSync(new URL('./dialogFocus.ts', import.meta.url), 'utf8');

describe('o fechamento lógico devolve o foco antes da saída pintar inert (E2)', () => {
  it('prende/devolve com useLayoutEffect, e só devolve quando ainda é o dono do foco', () => {
    // useLayoutEffect, não useEffect: a devolução tem de rodar no MESMO
    // commit em que a intenção lógica vira `false`, antes do navegador
    // pintar a saída como inert.
    expect(FONTE).toContain("import { useEffect, useLayoutEffect, useRef } from 'react';");
    expect(FONTE).toMatch(/useLayoutEffect\(\(\) => \{\s*if \(!aberto\) return;/);

    // a guarda de posse (`donoDoFoco`): quem abre por último avisa que é
    // o dono, e quem fecha só devolve o foco se ninguém mais assumiu —
    // sem isto, numa troca A → B no mesmo commit, a ordem em que o React
    // reexecuta os efeitos de A e B decidiria quem fica com o foco, e às
    // vezes seria A devolvendo ao SEU gatilho depois de B já tê-lo posto
    // dentro de si.
    expect(FONTE).toContain('let donoDoFoco: string | null = null;');
    expect(FONTE).toContain('donoDoFoco = nome;');
    expect(FONTE).toContain('if (donoDoFoco !== nome) return;');
    expect(FONTE).toContain('donoDoFoco = null;');
  });
});
