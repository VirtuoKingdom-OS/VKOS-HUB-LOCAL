# As conexões sobem para o CORE, com o segredo tratado como segredo

## Contexto

`conexoes.json` vivia em `app/dados/workspaces/<id>/`, uma cópia por cliente. Hoje só existe uma conexão no catálogo, a Apify, que alimenta a busca de leads do CRM. E o CRM já é do dono do Hub desde a subida dele para o CORE.

O resultado prático era absurdo: o mesmo token da mesma conta, paga pelo mesmo dono, precisava ser colado de novo a cada cliente, e a busca de leads parava de funcionar ao trocar de projeto. O `PUT /conexoes/:id` ainda respondia 400 "nenhum cliente ativo" para uma configuração que não tem nada a ver com cliente.

## Decisão

O estado passa para `app/dados/conexoes.json`, no escopo CORE. A pasta existe sempre, então nenhuma rota de conexões depende de workspace aberto e o 400 por falta de cliente ativo deixou de existir. `VKOS_DADOS_TESTE` vale aqui como vale no CRM e no histórico de custos, senão o teste grava por cima do token real do dono.

A migração segue o desenho já provado em `crm/fusao.ts`:

- Roda uma vez só, na primeira leitura em que o arquivo do CORE ainda não existe.
- Os workspaces são percorridos em ordem de id. Sem ordem estável o resultado muda a cada execução e não dá para testar.
- Grava o destino antes de renomear as origens. Uma queda no meio repete a fusão sem duplicar nada.
- A origem nunca é apagada: vira `conexoes.json.migrado-para-core-<carimbo>`, por rename, com os bytes intactos.
- Arquivo ilegível vai para a quarentena, fica onde está sem rename, e a fusão segue com os outros.

**Conflito não é resolvido em silêncio.** Se dois workspaces tinham a mesma integração com config diferente, o primeiro em ordem de id vence e a divergência vira uma linha em `app/dados/conflitos-da-fusao.jsonl`: qual servidor bateu, quais chaves divergiram, quem venceu, quem perdeu, e o caminho do arquivo preservado onde o valor perdedor continua inteiro.

**Nenhum valor de config entra nesse rastro.** Nem segredo, nem campo comum. O arquivo de rastro fica ao lado do estado, e carregar o token dentro dele criaria uma segunda cópia do segredo por conveniência de leitura. A informação perdida não se perde: ela está no arquivo preservado, e a linha aponta para ele. Um teste afirma que o valor não aparece no rastro, porque essa é a garantia que importa.

**O arquivo migrado mantém o token, não é esvaziado.** Três razões:

1. Esvaziar é reescrever, e reescrever destrói exatamente o original que a regra "nunca apagar" existe para proteger. Se a gravação no CORE tiver saído errada, o token não se reconstitui de lugar nenhum: ele foi digitado à mão e não tem cópia.
2. O rename não espalha segredo. Ele deixa o arquivo exatamente onde ele já estava, na pasta de dados daquele cliente. O que a migração acrescenta é o arquivo do CORE, que é a razão da mudança, não um efeito colateral dela.
3. A cópia preservada tem fim de vida natural: `apagarPastaDadosWorkspace` continua removendo a pasta inteira quando o workspace sai do registro, e a cópia vai junto. O teste de limpeza agora afirma isso nomeando o arquivo migrado, em vez de um `conexoes.json` que não mora mais ali.

**O que mudou na garantia do `SECURITY.md`.** A garantia 3 dizia "excluir um workspace apaga os segredos dele". Isso continua verdade para o que é do workspace, mas o token da Apify deixou de ser dele: ele é do dono e sobrevive à exclusão de qualquer projeto, de propósito. O `SECURITY.md` foi corrigido para dizer as duas coisas separadas, porque uma garantia de segurança que descreve errado o que protege é pior que nenhuma.

O arquivo `mcp-config.json` continua sendo gravado na pasta do workspace da sessão. Ele não é estado, é artefato daquele spawn: duas sessões de clientes diferentes não podem disputar o mesmo caminho.

## Por quê

**Por que não escolher o token "mais completo" automaticamente.** Pelo mesmo motivo de o CRM não fundir contato duplicado: o palpite erra e o custo de errar não é simétrico. Dois tokens diferentes podem ser duas contas Apify de verdade, uma de teste e uma de produção. Escolher sozinho custa uma busca de leads correndo na conta errada, com crédito real. Não escolher custa uma linha num arquivo de rastro que o dono resolve em dois cliques.

**Por que o primeiro em ordem de id vence, e não o mais recente.** Porque "mais recente" precisaria de uma data confiável dentro do `conexoes.json`, e ele nunca guardou uma. Inventar o critério na hora da migração seria pior que um critério simples e declarado, especialmente com o conflito virando anotação de qualquer jeito.
