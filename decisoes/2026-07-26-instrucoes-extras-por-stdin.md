# Instruções extras da sessão vão pelo stdin, não pela linha de comando

## Contexto

Investigando se o Modo enxuto tinha efeito real, ficou provado que ele podia não ter nenhum.

As instruções extras de uma sessão (a regra do Modo enxuto e o contexto agregado do CRM) eram entregues ao Claude como argumento de linha de comando, em `--append-system-prompt`. Quando o binário do Claude exige shell, o caso de instalação por npm (`claude.cmd`) ou do fallback pelo PATH, o `claude.ts` junta tudo numa string única e entrega ao `cmd.exe`.

Reproduzido com o `citarArg` real e a regra real, em 2026-07-26:

- Dos 2078 caracteres da regra, chegam 13. Só a primeira linha, porque o `cmd.exe` corta na quebra de linha.
- Pior: a linha de comando morre ali. `--mcp-config` e `--allowedTools`, que vinham depois, somem junto. Sem erro, sem aviso, código de saída 0.

Pelo caminho sem shell, o caso do `claude.exe` nativo, tudo chega inteiro. O Codex nunca teve o problema porque já mandava as instruções pelo stdin.

## Decisão

Instrução extra de sessão nunca mais viaja na linha de comando. Ela vai pelo stdin, junto do prompt, num bloco marcado, como o Codex já fazia.

Junto entra a cobertura que faltava: teste afirmando que a instrução chega inteira nos dois provedores, e o primeiro `claude.test.ts` do projeto, já que a montagem de argumentos do provedor padrão nunca teve teste nenhum.

Vira regra de código, registrada no `CONTRIBUTING.md`: nenhum valor multilinha entra em argumento de processo filho.

## Por quê

O `--append-system-prompt` é system prompt de verdade e tem aderência maior que texto no prompt. Perder isso custa alguma força de instrução.

Mas a alternativa é manter dois caminhos, um que funciona e um que quebra em silêncio, e depender de qual instalação de Claude a máquina tem. Silêncio é o pior modo de falha possível: o toggle acende, o usuário acredita, e nada acontece. E o dano colateral, derrubar MCP e a lista de ferramentas liberadas, é maior que o benefício da aderência.

Um caminho só, que funciona em qualquer instalação, vale mais que dois caminhos com um deles bonito.

O Modo enxuto em si foi removido na mesma rodada, por decisão de produto. A correção continua necessária porque o contexto do CRM usa o mesmo caminho e não é opcional.
