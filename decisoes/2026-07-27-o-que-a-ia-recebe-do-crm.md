# O que a IA recebe do CRM

## Contexto

Três lugares descreviam a mesma regra de formas diferentes, e nenhum batia com o código.

O `README.md` prometia "insight agregado sim, nome e telefone nunca". O `SECURITY.md` prometia contexto "agregado, sem telefone e sem email, com proibição explícita de publicar dado identificável". E `app/server/src/crm/resumo.ts` envia o primeiro nome do contato em cada linha de "Vozes dos clientes", com um teste que afirma ser intencional.

Conferido no código em 2026-07-27:

- O resumo só é montado quando o prompt cita o CRM, em `sessoes/rotas.ts`.
- `anonimizarTextoCrm` apaga o email e o telefone conhecidos do contato, e depois varre o texto atrás de qualquer email ou sequência de 8 a 15 dígitos e troca por marcador.
- `primeiroNome` corta o nome no primeiro espaço e passa o resultado pela mesma limpeza.
- A tal "proibição explícita de publicar dado identificável" não existe. O texto injetado começa em "# Resumo agregado do CRM" e não traz instrução nenhuma.

Ou seja: duas promessas escritas que o produto não cumpria. Documentação que promete demais é pior que documentação ausente, porque cria confiança que não se sustenta.

## Decisão

O primeiro nome continua indo. A documentação passa a dizer isso com todas as letras, e a proibição que o `SECURITY.md` promete vira texto de verdade dentro do resumo.

O que a IA recebe do CRM, na íntegra: contagem de contatos e valor somado por estágio, follow-up atrasado e dos próximos sete dias, as tags mais comuns, quantos contatos estão esquecidos, e até quinze interações recentes identificadas só pelo primeiro nome, com o texto limpo de telefone e email.

Telefone completo, email, endereço e documento não entram.

## Por quê

Sem nome nenhum, o conselho vira inútil: "o contato 3 reclamou do prazo" não permite agir. Com o primeiro nome, o Jesse sabe de quem se trata e a IA consegue conectar conversas do mesmo cliente.

Primeiro nome sozinho tem pouco poder de identificação e alto valor de uso. Telefone e email são identificadores diretos, ligam a pessoa a tudo que existe fora do Hub, e não acrescentam nada ao conselho. Por isso a linha fica exatamente aí.

Vale ser honesto sobre o limite: a proibição dentro do resumo é instrução para um modelo, não garantia técnica. Ela reduz o risco de o nome aparecer numa peça publicada, não elimina. A garantia técnica de verdade é a limpeza automática de telefone e email, que roda antes de qualquer texto sair.

Se o Jesse preferir que nem o primeiro nome saia, é uma linha em `primeiroNome` e o teste que a acompanha. O custo é o conselho ficar anônimo.
