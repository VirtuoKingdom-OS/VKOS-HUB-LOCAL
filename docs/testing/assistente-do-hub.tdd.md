# Evidência TDD: Assistente do Hub

Data: 2026-08-04

## RED e GREEN

Os testes novos foram escritos antes das implementações dos módulos do
Assistente. A primeira execução falhou por módulos ausentes. Depois da
implementação, os testes específicos passaram e foram ampliados para cobrir:

- schema e catálogo fechado de tarefas;
- fila append-only, colapso por id e transições de aprovação;
- saneamento de tarefa `rodando` após reinício;
- rastro somente com fonte de servidor e paginação por cursor;
- sessão CORE, transcrição, custo e briefing por stdin;
- contrato do prompt, ambiguidade sem lote e isolamento de `lote.json`.

## Portões executados

- `npm run checar -w server`: passou.
- `npm run checar -w web`: passou.
- `npm run testar -w server`: 536 passaram, 0 falharam.
- `npm run testar -w web`: 256 passaram, 0 falharam.
- `npm run build -w web`: passou.
- testes de camadas, tokens, contraste, sombras, densidade, empilhamento e
  alvos de toque: passaram dentro da suíte web.
- QA visual pelo navegador Edge, usando dados descartáveis: passou em claro e
  escuro, em 1280x720, 1440x900 e 390x844. A rota montou sem erro de React,
  sem 404 de API e sem overflow horizontal. A abertura de conversa também foi
  verificada sem iniciar uma sessão de IA.

## Limites conhecidos

A medição com IA real da Fase 5 não foi executada porque pode consumir créditos
do CLI configurado. O caminho usa pasta temporária, `VKOS_DADOS_TESTE` e
`VKOS_PORT`, mas ainda requer autorização explícita para iniciar o provedor.

A medição com IA real continua pendente. A consolidação dos prompts antigos do
wizard em reexportações canônicas do servidor também continua aberta; os
módulos server do executor já existem e os prompts do wizard foram preservados
sem alteração comportamental. O QA visual determinístico foi fechado em porta
isolada com dados temporários; o processo temporário foi encerrado.
