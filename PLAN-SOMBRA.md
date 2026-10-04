# A sombra dobrada de Plutão e Caronte — tirar a sombra assada das fotos da sonda (03/10/2026)

Pedido dele (03/10, manhã): *"vamos tirar a sombra"*. Ramo `sombra-dobrada` (backup: `git push -u origin sombra-dobrada`).
Ferramentas, candidatos e imagens da rodada em `capturas/sombra-dobrada/` (fora do git; nada no scratchpad).

## O defeito
O mapa de cor do lado fotografado traz a sombra do relevo sob o Sol da hora de cada foto da sonda; o app acende o
mesmo relevo (normal.png, Lambert) com o Sol dele. Com o Sol do app do mesmo lado a sombra DOBRA; do outro lado as
duas brigam. O sul e o lado de trás inventados (rodada da cor) levam de propósito a sombra do relevo inventado sob o
Sol assado (`sombraNoAlvo`), para casar com o lado fotografado — dobram também.

## Fatos medidos (03/10; réguas em `capturas/sombra-dobrada/ferramentas/`)
- Foto e DEM alinhados (deslocamento ótimo 0,0 texel; `registro.mjs`).
- Na região nítida de Caronte (Oz Terra), a banda de 4–10 km do brilho correlaciona r = 0,68 com o sombreado do DEM;
  o ganho é o de Lambert com Sol a ~40–45° (1,2 de brilho relativo por unidade de n·L).
- O Sol muda de foto para foto: a direção local, medida por regressão (`mapas-de-ganho.mjs`), é ~300–340° no
  hemisfério das fotos e vira para o SUL ao norte de ~50°N — o que dá o ponto subsolar a ~51°N do sobrevoo. Um Sol
  único no espaço tangente (o da rodada da cor) explica bem menos (r 0,19 contra 0,27 no domínio todo).
- O chiado fino do DEM (banda < 2 km em Caronte) dilui o ganho; as bandas das formas (5–60 km) têm o ganho físico.
- Onde a foto é borrada ou o DEM ruim, o ganho local cai sozinho. As caixas `dadoRuim` do JSON do relevo (limbo de
  Caronte, preenchimento polar dos dois) imprimem redemoinho se entrarem: excluir as bandas finas delas.

## Decisões técnicas (minhas; a de gosto é dele, por foto)
1. Método (V3 do protótipo): brilho relativo partido em bandas (oitavas do relevo, até ~60 km); a direção local do
   Sol por regressão de duas variáveis em janela grande; em cada banda, a derivada do relevo NESSA direção e o ganho
   por mínimos quadrados de uma variável em janela pequena (≥ 30 km, 3 × a banda), preso em [0, 2]. Sai só o que o
   relevo MEDIDO explica, só onde há foto e DEM (menos as bandas finas das caixas `dadoRuim`), com rampa de 60 km na
   borda. Brilho ÷ (1 + P), o mesmo fator nos três canais.
2. No inventado (sul, faixa, lado de trás), a sombra que a rodada da cor pôs (`sombraNoAlvo`) sai inteira — os
   retalhos não mudam (o resultado é afim nela). Isso muda o que ele aprovou por prancha: vai por foto, com o antes.
3. Passo novo da cadeia da cor dentro de `inventaCorDoCorpo` (opção), módulo novo `sombra-assada.mjs` com teste;
   portão por hash com chave nova; o DEM medido vem do cache do relevo (`.cache/relevo/<corpo>-4096.*`, sha256
   impresso), as caixas `dadoRuim` do JSON do relevo.

## Etapas
1. [feito] Medir e prototipar (V1 → V3) com simulação de Lambert (`render-lambert.mjs`).
2. [ ] V4 do protótipo: oitavas do relevo, `dadoRuim` por banda, rampa por banda; conferir polos e limbo.
3. [ ] Fotos do app com o candidato (CDP), lado fotografado dos dois, Sol do norte (hoje) e do sul (1980), relevo
   ligado e desligado; prancha antes | depois para ele.
4. [ ] O inventado sem a sombra (opção em `inventaCorDoCorpo`), fotos do sul (T4, P5) antes | depois; palavra dele.
5. [ ] Levar ao módulo com teste; portão; confissão pt/en na ficha.
6. [ ] Assar (no terminal dele, com o sim dele), conferir hash e escada, `data:verify`, `done`, fotos finais, merge
   com a palavra dele.

## Fora do escopo
Tritão (a próxima da fila, plano próprio); sombra mais fina que o DEM alcança (fica na foto, confessada); mexer no
relevo (normal.png); publicar.
