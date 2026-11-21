# Relógio do Atlas aprovado: levar o protótipo do Codex para o app (20/11/2026) — NO PRINCIPAL (e36d9225), não publicado; falta só a sonda de movimento

O dono aprovou o relógio novo e pediu: usar o código do Codex como base, substituir o relógio antigo no computador e no celular, conferir contra o vídeo, e só então remover a interface antiga, os estilos e textos sem uso e os arquivos da demonstração. Validar PT/EN, teclado e movimento reduzido, `npm run done`, UM commit local, sem publicar. Coordenar com a auditoria em andamento (`PLAN-AUDITORIA.md`, rodada 2).

## A base aprovada (não reinventar)

- `docs/propostas/relogio-atlas.tsx` (componente `Relogio`), `docs/propostas/relogio-atlas.css`, `docs/propostas/relogio-atlas.html` — commit `5001d15e`.
- Provas, fora do git, que FICAM: `capturas/proposta-relogio-atlas/` — o vídeo aprovado `relogio-do-atlas.mp4` (11,5 s: ao vivo → painel aberto avançando a 1,2 d/s → pausado → de volta ao vivo) e `comparacao-final.png`.
- O que é provisório no protótipo e NÃO vai para o app: o iframe, `window.__director`, a montagem manual (`createRoot`, `MutationObserver`, `.suporte-relogio`, classe `previa-relogio`), a leitura por `setInterval`, a escrita por `dataset` na alça do celular, o laço de `ciclarDegrau`, os textos e o `pt-BR` fixos.

## Decisões desta conversa (a encomenda segue isto)

1. **Lugar:** o relógio novo substitui `BarraDoTempo` em `src/components/HudDoAtlas.tsx`; a gaveta do celular (`GavetaDoTempo`, a folha `[data-dialogo="tempo"]`) passa a mostrar o mesmo componente sempre aberto; a alça (`BotaoDoTempo`, `BarraOuAlcas.tsx`) mostra estado e instante por props, em React.
2. **Fluxo de dados:** uma fonte só, a que já existe — o Director publica `EstadoDoTempo` por `onTempo`, o `App` guarda e passa por props. Nada de leitura por intervalo no componente.
3. **Cadência do mostrador:** o novo mostra segundos (ao vivo e nos degraus lentos), minutos (rápido) ou a data (dias por segundo). A regra de publicação (`mesmoMostrador` / `publicarTempo`, `src/three/tempoDoAtlas.ts` e `director/maquinaDoTempo.ts`) passa a comparar o que ESTE mostrador escreve, com teto de ~4 publicações por segundo.
4. **Máquina do tempo:** `escolherDegrau(n)` substitui `ciclarDegrau()` (o ciclo morre com o botão antigo). A semântica do protótipo mora na máquina, com teste, não no componente: tocar/pausar lembra o último sentido (sobrevive à gaveta fechar e abrir); pausar a partir do ao vivo vai ao degrau 0 e para; escolher degrau ≠ 0 ao vivo sai do ao vivo andando para a frente; escolher sentido ao vivo vai ao degrau 0 antes; "Voltar ao presente" liga o ao vivo; "Retrato de 2026" é o `voltarAEpoca` de hoje.
5. **Língua:** todo texto em `src/lib/idioma/pt.ts` e `en.ts`; datas e números pela língua do app, não por `pt-BR` fixo. A hora segue em UTC com o rótulo, como aprovado.
6. **Estilo:** vai para as folhas do HUD (onde hoje mora `.atlas-tempo`), com os tokens da casa que o protótipo já usa; os nomes deixam de dizer "proposto". As regras de celular, de movimento reduzido e de foto (`?shot=`) seguem o padrão das folhas vizinhas.
7. **Teclado:** Esc fecha o painel e devolve o foco ao botão que o abriu, pelo mecanismo de Esc da casa; a régua é um `input range` de verdade; tudo alcançável por Tab com foco visível.
8. **Sem regressão:** as oito velocidades, voltar/parar/avançar, ao vivo, o retrato de 2026, os três avisos (buscando, sem efeméride, fora de 1950–2050), o link com `jd`, a gaveta do celular. Os testes e os juízes que descrevem a barra antiga (`scripts/visual/atlas-smoke.mjs`, `a11y.mjs`, `a11y-celular.mjs`, `sonda-motion.mjs`, `colar-da-fita.mjs`) são reescritos para o relógio novo, não apagados.
9. **Remoção, depois de conferir contra o vídeo:** a barra antiga, o CSS `.atlas-tempo*`, os textos sem uso, `ciclarDegrau`, e os três arquivos de `docs/propostas/relogio-atlas.*`.

## Passos

- [x] 1. Implementado na cópia `..\Mar-relogio` (ramo `relogio-atlas`): componente, máquina, publicação, textos, estilo, ligação no `App`, testes.
- [x] 2. Fotos nos estados do vídeo, computador e celular, PT e EN, em `capturas/relogio-atlas-integracao/`; comparadas aqui com o vídeo e a prancha aprovados: batem.
- [x] 3. Removidos a barra antiga (~545 linhas), o CSS `.atlas-tempo*` (~430 linhas), 20 textos por língua, `ciclarDegrau`, `formatarTaxa` e os três arquivos da demonstração. Juízes `atlas-smoke`, `a11y`, `a11y-celular` e `colar-da-fita` reescritos para o relógio novo.
- [x] 4. Juntado ao principal em UM commit (`e36d9225`), depois das seis frentes da auditoria; `npm run done` passou (184 arquivos, 4171 testes); backup. Visto no app do principal: ao vivo, e avançando a 1,2 d/s com o painel aberto. Não publicado.
- [ ] 5. `scripts/visual/sonda-motion.mjs` ficou convertida pela metade: a sequência C3 já julga o relógio novo; as checagens de interrupção I2c, I4, I5 e a amostragem de entrada e saída (`jsAmostraTempo`) ainda descrevem a barra antiga (linha que abria no hover), que não tem equivalente direto. Converter para a dobra do painel novo ou retirar, dizendo.

## Medidas e escolhas desta conversa

- Inglês: data na ordem da casa ("Nov 23, 2026"); botões "Reverse" / "Advance", estados "Reversing" / "Advancing".
- `TEMPO_FRACAO` segue 0,19 (pior caso medido 18,6 %: pausado com a faixa "Voltar ao presente", ui 0,85). A reserva da segunda linha morreu: o relógio novo não quebra. Com texto grande em janela estreita o assunto fica um pouco mais baixo e maior.
- Custo de uma publicação com a ficha aberta: ~8 ms ao vivo (1 por segundo); a ficha só troca texto, sem piscar.
- Com a ficha aberta e o foco no relógio, Esc não fecha o painel (igual ao selo e à barra antiga).

## Fora

Fuso do visitante, escolher data, filmes. O `rotulos.ts` modificado no principal não entra.
