# Como se trabalha neste repositório

Vale para pessoa e para IA. Quem não segue isto não fecha rodada.

## Antes de começar

Leia, nesta ordem:

1. [CLAUDE.md](CLAUDE.md), as regras da casa.
2. `contexto/visao.md`, `contexto/arquitetura.md` e `contexto/roadmap.md`.
3. A pasta `decisoes/`, se o assunto já foi debatido antes.

Não confirme a leitura. Use o que leu.

## Fluxo de uma rodada

1. **Rodada grande nasce de um plano.** Uma pasta em `planos/nome-da-rodada/` com visão, arquitetura e execução. O plano é auditado antes de virar código.
2. **Executa por fase.** Cada fase termina verde: typecheck, testes e build.
3. **Registra a decisão.** Toda escolha de produto ou técnica vira `decisoes/AAAA-MM-DD-titulo.md`, com contexto, decisão e por quê.
4. **Atualiza o contexto vivo.** Fase fechada ou arquitetura mudada significa editar o arquivo correspondente em `contexto/`, na linha que mudou. Não reescreva o arquivo inteiro.
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
