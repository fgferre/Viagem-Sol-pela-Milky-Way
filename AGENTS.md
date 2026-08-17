# Princípios para agentes

1. Leia o `docs/PENDENCIAS.md` primeiro — é a lista viva do que está quebrado e do que falta, na língua do dono. Depois o `docs/NORTE.md` (o que ainda decide), o `README.md` e o código atual antes de editar. Trabalho de estrela: `docs/LEI-DA-ESTRELA.md` é o contrato; o `PLANO-ATLAS.md` só cobre o que falta da fusão do Atlas. Relatórios, prompts e planos são hipóteses, não fontes de verdade. O `NORTE.md` diz para onde o projeto vai, o que já foi decidido e o que não se repete — mantenha-o vivo: o que virou código sai de lá, o que ainda decide algo entra.
2. Procure a implementação existente antes de criar arquivo, dependência, helper ou documentação.
3. Faça a menor mudança coerente; não adicione abstração, compatibilidade ou feature especulativa.
4. Mantenha uma fonte de verdade. Atualize o contrato existente em vez de duplicá-lo.
5. Apague logs, caches, builds, capturas e temporários quando terminarem de servir.
6. Só remova código após provar que não há import, chamada, script ou uso em runtime. Preserve dados científicos e alterações do usuário.
7. Valide a mudança com os gates relevantes, e **a prova tem de medir o que mudou**: vista capturada sem HUD não prova trabalho de HUD; vista com o relógio parado não prova nada que só apareça em movimento. Se o gate existente não cobre a mudança, a obrigação é **criar a vista que cobre**, nunca exibir a que não cobre. Gate bit-idêntico é **detector de regressão** — nunca objetivo, nunca justificativa para desfazer melhoria. Renderização só está pronta depois de verificação no navegador.
8. Registre apenas o resultado, os testes e os limites reais. Não deixe diários, prompts ou relatórios já consumidos no projeto. **Com o dono, fale simples** — ele é leigo em programação; densidade técnica vai para commits e documentos, nunca para o chat. Em documento, cite a **peça** (`aproximarDoSol`, `RAIO_SOL_PC`), nunca o número de linha — a linha anda, o nome não.
9. **Melhoria visível é a direção do trabalho.** Palavras do dono em 2026-08-11: "Nunca foi criada essa regra que nada muda na tela. Estamos sempre caminhando no sentido das melhorias, se nada muda na tela isso fica impossível". E em 2026-08-13: "nada é fixo, tudo sempre pode ser questionado se melhora UX" — decisão herdada, número ou formato não estão protegidos quando atrapalham a experiência.
10. **Você é o juiz da mecânica interna.** Técnica de render, arquitetura, número, formato: decida, faça, e volte com IMAGEM. Pergunte ao dono só o que é gosto, prioridade ou escopo.
11. **Um arquivo, um assunto.** Arquivo que acumulou assuntos divide-se na primeira mudança que o tocar — mover e agrupar, nunca reescrever — e quem só precisa do referencial não importa o mundo inteiro junto.

Crie um commit local a cada checkpoint coerente de implementação validada — sem esperar pedido. Não faça push sem pedido explícito.

Quando o dono reportar um problema, escreva-o em `docs/PENDENCIAS.md` **naquele momento** — não no fim da sessão, não "depois que eu confirmar". Este projeto não sofre de falta de registro; sofre de conversa que morre com a janela. Escreva com as palavras dele, não com as suas: o que ele VÊ é o item; a causa técnica, quando houver, é uma linha abaixo. Item resolvido sai da lista e vira commit — a lista é do que está aberto, não um diário.

## Trazer um documento de volta

A reforma de 2026-08-14 apagou diário, não ciência. O ponto de restauro é a tag `docs-antes-da-reforma`. Qualquer arquivo volta com:

```
git show docs-antes-da-reforma:docs/NORTE.md
git checkout docs-antes-da-reforma -- docs/RETOMADA.md
```

Não recrie pasta de história: o git é o diário.
