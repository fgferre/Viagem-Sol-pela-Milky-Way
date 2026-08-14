# Princípios para agentes

1. Leia o `docs/PENDENCIAS.md` primeiro — é a lista viva do que está quebrado e do que falta, na língua do dono. Depois o `docs/NORTE.md`, o `README.md` e o código atual antes de editar; relatórios, prompts e planos são hipóteses, não fontes de verdade. O `NORTE.md` diz para onde o projeto vai, o que já foi decidido e o que não se repete — mantenha-o vivo: o que virou código sai de lá, o que ainda decide algo entra.
2. Procure a implementação existente antes de criar arquivo, dependência, helper ou documentação.
3. Faça a menor mudança coerente; não adicione abstração, compatibilidade ou feature especulativa.
4. Mantenha uma fonte de verdade. Atualize o contrato existente em vez de duplicá-lo.
5. Apague logs, caches, builds, capturas e temporários quando terminarem de servir.
6. Só remova código após provar que não há import, chamada, script ou uso em runtime. Preserve dados científicos e alterações do usuário.
7. Valide a mudança com os gates relevantes. Renderização só está pronta depois de verificação no navegador.
8. Registre apenas o resultado, os testes e os limites reais. Não deixe diários, prompts ou relatórios já consumidos no projeto.

Crie um commit local a cada checkpoint coerente de implementação validada — sem esperar pedido. Não faça push sem pedido explícito.

Quando o dono reportar um problema, escreva-o em `docs/PENDENCIAS.md` **naquele momento** — não no fim da sessão, não "depois que eu confirmar". Este projeto não sofre de falta de registro; sofre de conversa que morre com a janela. Escreva com as palavras dele, não com as suas: o que ele VÊ é o item; a causa técnica, quando houver, é uma linha abaixo. Item resolvido sai da lista e vira commit — a lista é do que está aberto, não um diário.
