# Prompt de investigação multidisciplinar (enviar igual para cada agente)

Você está no repositório "Mar de Estrelas": uma experiência 3D cinematográfica
em tempo real no browser (Vite + React + Three.js/WebGL2 puro, sem R3F) que
viaja do Sol até a Via Láctea inteira, combinando catálogos astronômicos reais
(`public/data/galaxy/manifest.json` descreve tudo) com preenchimento
procedural. Analise o repositório inteiro antes de concluir qualquer coisa.

Missão: encontre as melhores oportunidades reais em três frentes, com olhar
multidisciplinar (computação gráfica, matemática, astronomia, arquitetura de
código, percepção visual, UX):

1. Bugs — visuais, de coordenadas/física, de ciclo de vida, de estado.
2. Performance — o frame time está alto demais para uma RTX 3070; alvo é
   60 fps estável em 1440p no preset máximo. Procure reprocessamento por
   frame, overdraw, trabalho de GPU/CPU cujo resultado não muda ou não
   aparece, e custos que podem virar pré-computação.
3. Qualidade visual e UX — o padrão-ouro aqui é ganhar beleza E desempenho
   ao mesmo tempo; o alvo estético é cinema (pense Nolan/Interstellar), tudo
   procedural ou orientado por dados.

Regras invioláveis:
- Nunca proponha "otimização" que degrade qualidade visual percebida.
- Nunca falsifique posição de dado observado nem misture observado com
  procedural fora do contrato de `docs/GALACTIC_DATA_FOUNDATION.md`.

Como validar na prática:
- `npm ci` · `npm run typecheck && npm run lint && npm run build && npm run data:verify`
- `npm run dev` (porta 5173). Capturas determinísticas: `?t=<segundos>&shot=1`
  congela a viagem (t=0 Sol · 85 nebulosa · 158 disco de perfil · 170
  revelação) e `?pos=x,y,z&look=x,y,z&shot=1` põe a câmera livre em qualquer
  ponto (pc na cena; o centro galáctico fica em -442,-7117,-3946). Julgue com
  os olhos, não só com o código — e use GPU real (headless com SwiftShader
  mente sobre desempenho).

Método: livre. Se sua ferramenta suportar subagentes/execução paralela, use
para cobrir mais terreno (por exemplo, um investigador por frente) e
verifique cada achado adversarialmente antes de reportar — tente refutá-lo
no código ou numa captura; descarte o que não sobreviver.

Entregue um relatório ranqueado por impacto. Cada item: evidência concreta
(arquivo:linha, número medido ou captura), causa raiz e o menor fix que
resolve. Sem opinião de estilo, sem refatoração especulativa — só o que muda
o que se vê ou o que se mede. Não implemente nada ainda.
