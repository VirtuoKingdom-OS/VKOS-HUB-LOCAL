# Como se trabalha neste repositório

Vale para pessoa e para IA. Quem não segue isto não fecha rodada.

## Antes de começar

Leia, nesta ordem:

1. [CLAUDE.md](CLAUDE.md), as regras da casa.
2. `docs/contexto/visao.md`, `docs/contexto/arquitetura.md` e `docs/contexto/roadmap.md`.
3. A pasta `docs/decisoes/`, se o assunto já foi debatido antes.

Não confirme a leitura. Use o que leu.

## Fluxo de uma rodada

1. **Rodada grande nasce de um plano.** Uma pasta em `docs/planos/nome-da-rodada/` com visão, arquitetura e execução. O plano é auditado antes de virar código.
2. **Executa por fase.** Cada fase termina verde: typecheck, testes e build.
3. **Registra a decisão.** Toda escolha de produto ou técnica vira `docs/decisoes/AAAA-MM-DD-titulo.md`, com contexto, decisão e por quê.
4. **Atualiza o contexto vivo.** Fase fechada ou arquitetura mudada significa editar o arquivo correspondente em `docs/contexto/`, na linha que mudou. Não reescreva o arquivo inteiro.
5. **Atualiza o mapa.** Criou, removeu, renomeou ou mudou a responsabilidade de um módulo, tela, integração ou fluxo? `interno/mapa-sistema.json` é atualizado na mesma tarefa. O mapa é contrato vivo, não documentação opcional.
6. **Apaga o plano.** Rodada fechada, pasta do plano some.

## Portão de qualidade

Nada fecha sem os três verdes:

```bash
cd app
npm run checar -w server && npm run checar -w web
npm run testar -w server && npm run testar -w web
npm run build -w web
```

Teste novo acompanha comportamento novo. Correção de bug entra junto com o teste que teria pegado o bug.

### O portão que os cinco não cobrem

Nenhum dos comandos acima vê um pixel. Eles provam que o código compila, que a lógica está certa e que o pacote sai. Não existe teste de DOM neste projeto.

Por isso, **rodada que mexe em estilo, em navegação ou que cria tela nova roda também a conferência visual**:

```bash
# de uma janela, com dados descartáveis
cd app
VKOS_DADOS_TESTE=/tmp/dados-de-teste VKOS_PORT=4702 npx tsx server/src/index.ts

# de outra
node ferramentas/olhar-telas.mjs --porta 4702 --saida ./fotos-telas
```

Ela abre a interface num navegador de verdade e percorre **13 telas em três tamanhos** (1440x900, 1366x768 e 1280x720, que é o notebook comum). Reprova por: erro de console, tela que não renderiza, tela sem botão, rolagem horizontal, elemento estourando pra direita, alvo de toque abaixo de 24px, texto abaixo do piso de 11px da escala, e item de menu fora do alcance. Rode nos dois temas: o padrão já é o Claro, e o segundo passa com `--tema escuro`.

**Ela mede altura, e isso não é detalhe.** Em 2026-07-27 a barra lateral empilhava os dois níveis de navegação e sobrava 33px pro menu do projeto num notebook de 720px. Compilava, passava nos cinco portões, e a pessoa não conseguia clicar nos próprios itens. Nenhum teste via isso porque nenhum teste tinha altura. Ver `docs/decisoes/2026-07-27-um-nivel-por-vez.md`.

Além do sintoma, ela checa o mecanismo: o menu tem que ser quem cede altura quando falta espaço, e o resto da barra não. Essa checagem pega o defeito **antes** de existir conteúdo bastante pra ele aparecer, que é como ele passou batido da primeira vez.

Isso não substitui o olho. Guarde as fotos de antes, faça a mudança, gere as de depois e compare. Diferença que você não sabe explicar é regressão até prova em contrário. Detalhes em `ferramentas/LEIA-ME.md`.

## Git

- **Nunca faça commit, push ou PR sem ordem explícita do Jesse.** Sem exceção.
- Branch de trabalho sai de `main`.
- Mensagem de commit em português, no imperativo, dizendo o efeito e não o arquivo.
- Um commit por unidade de sentido. Não misture remoção com redesenho.

## Escrita

Vale para código, comentário, documento, decisão e interface.

- Português brasileiro.
- Nunca use travessão nem ponto centrado. Vírgula, ponto ou dois-pontos.
- Frase curta e direta.
- Sem jargão de startup.
- Comentário explica o porquê, não o quê.

## Código

- **Cor só por token.** Nenhuma cor de tema hardcoded em componente.
- **Dado do usuário é sagrado.** Arquivo existente nunca é sobrescrito às cegas. Na dúvida, quarentena com data.
- **Sem valor multilinha na linha de comando.** Argumento de processo filho com quebra de linha quebra em Windows sob shell. Use stdin ou arquivo.
- **Nada de dependência nova sem justificativa.** Recurso nativo antes de biblioteca.
- Nome de arquivo, função e variável em português.

## Estrutura de pastas

```
app/server/src/<modulo>/     estado.ts, rotas.ts, e o teste ao lado
app/web/src/componentes/<area>/
app/web/src/api/             cliente HTTP por área
app/web/src/estilos/         tokens e camadas de tema
```

Módulo novo nasce com `estado.ts`, `rotas.ts` e teste. Registro em `app/server/src/index.ts`.
