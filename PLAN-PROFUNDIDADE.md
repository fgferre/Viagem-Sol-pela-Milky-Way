# Profundidade do motor: o que está longe some da conta quando a câmera encosta numa superfície (aprovada em 21/11/2026) — EM OBRA numa conversa paralela, a pedido do dono; cópia `..\Mar-profundidade`, ramo `profundidade-do-motor`; quem junta ao principal é a conversa coordenadora, depois de fechar a leva dela

O dono aprovou ("Sim, depois desta") uma rodada própria para o defeito geral. Depois ele sugeriu abrir uma conversa paralela para a rodada: ela faz os passos 1 a 4 num ramo só dela, sem trocar o padrão; a junção fica para depois de fechada a leva de 20–21/11 (auditoria do Gemini rodada 2, relógio do Atlas, anel de Saturno). Ele pediu solução que melhore o app inteiro, não remendo por corpo.

## O que se sabe (medido em 20–21/11, `PLAN-AUDITORIA.md`)

- O near acompanha a superfície mais próxima a 0,4 % da distância (`nearPlanePc`, `src/three/core/engine.ts`); o far fica em 60.000 pc. Sem profundidade logarítmica nem invertida.
- Um buffer comum não separa nada além de ~near × 2^24. Na vista dos anéis de Saturno o near é 3 m: tudo além de ~50 mil km cai no valor do fundo.
- Efeito VISTO: com as peças do anel escondidas e a câmera encostada no anel, traços de uma linha de órbita aparecem por cima do globo de Saturno. Não se viu estrela, lua nem rótulo atravessando. (O "globo transparente" que o dono reportou NÃO era isto: era o anel na frente do globo — ver o plano da auditoria.)
- three r185 tem `reversedDepthBuffer` no construtor do `WebGLRenderer`; pede a extensão `EXT_clip_control`. Sem ela o three volta ao buffer comum.

## Passos (pela ordem)

- [ ] 1. Inventário, só leitura: o que no app depende da convenção de profundidade (materiais com `depthFunc` próprio, `gl_FragCoord.z`, texturas de profundidade, as consultas de oclusão da lente, o passe do clarão do campo, os alvos do compositor e o formato de profundidade deles, `polygonOffset`). E onde mais o defeito aparece hoje: procurar por foto perto de superfícies (Fobos, anéis, Sol, luas pequenas) com linhas de órbita e corpos atrás.
- [ ] 2. Suporte: o que `EXT_clip_control` responde neste PC (Direct3D 11 e Vulkan), no iPhone e no Android. Decidir o que acontece onde não há (o defeito fica como hoje? outro caminho?).
- [ ] 3. Prova de conceito numa cópia, atrás de um interruptor de URL: profundidade invertida com alvo em ponto flutuante; fotos idênticas ponto a ponto nas vistas de referência; o traço de órbita some.
- [ ] 4. Rodar TODOS os juízes de imagem com o interruptor ligado antes de virar padrão.
- [ ] 5. Só então trocar o padrão, com o modo antigo guardado como reserva enquanto não provar ser inútil.

## Decisões já tomadas

- Não mexer no `nearPlanePc` para remediar (pinado por teste; o defeito voltaria mais perto da superfície).
- Não remendar material por material.
- Não entra na leva de 20–21/11.
