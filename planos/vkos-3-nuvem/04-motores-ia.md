# VKOS 3.0, motores de IA

## As três situações, sem mistura

1. **CORE (Jesse)**: Claude Code com a credencial pessoal do Jesse, logada uma vez na VM pelo programa oficial. Uso individual do titular, permitido pelos termos. Vive só no container core. É o Claude que trabalha em tudo que o Jesse fizer, inclusive nas features usadas por ele.
2. **Workspace de cliente com `claude_team`**: o cliente tem seat próprio (Claude Team ou conta própria). O Jesse gerencia essa credencial pelo cofre para o cliente não precisar tocar em configuração, com consentimento registrado. Cada cliente usa a própria conta: sem compartilhamento de credencial entre clientes, nunca.
3. **Workspace de cliente com `gemini`**: Vertex AI no projeto Google Cloud do Jesse. O Jesse banca, mede por workspace e cobra por fora. É o caminho padrão para cliente que não tem conta de IA.

O motor `nenhum` completa o quadro: workspace sem IA, features funcionam no modo manual.

## O serviço motor

O contrato de provedor do 2.x (Claude e Codex atrás de uma interface única) evolui para o broker:

```
POST /interno/sessao        { workspaceId, feature, pedido, anexos }
  -> resolve motor e credencial do workspace no banco e no cofre
  -> executa (Vertex SDK para gemini, CLI/API para claude_team)
  -> devolve stream de eventos no formato que o front já conhece
     (texto, tool_use, custo), igual ao WS atual
```

- O formato de eventos do 2.x é mantido. As telas que já renderizam streaming, markdown e custo não mudam.
- O motor aplica o limite de orçamento antes de abrir sessão: estourou e a ação é `cortar`, responde erro amigável que a tela mostra ("IA pausada neste workspace, fale com o suporte").
- Toda sessão fecha com um registro em `consumo_ia`.

## Gemini via Vertex AI

- Service account exclusiva, papel mínimo (`aiplatform.user`), chave acessível só ao container motor.
- Modelo padrão econômico e modelo forte, mapeados no motor como hoje o app mapeia Opus, Sonnet e Haiku. O Modo enxuto do 2.x segue valendo.
- As skills e a metodologia (camada de design, contratos de site, carrossel) são prompts e arquivos markdown: portáveis para o Gemini. O que é específico do Claude (MCP, skills nativas) fica marcado no manifesto da feature como capacidade do motor, e a interface esconde o que o motor do workspace não suporta, como o 2.x já faz com Codex sem MCP.
- Quota no próprio GCP como teto absoluto de gasto.

## Claude Team de cliente

- Credencial entra pelo CORE, direto pro cofre, com registro de consentimento.
- Sessões rodam no motor com aquela credencial exclusivamente para aquele workspace.
- Se a credencial expira ou falha, o motor marca o workspace, avisa o Jesse no CORE e a interface do cliente mostra estado claro em vez de erro cru.

## Regras duras

- O código de feature nunca lê credencial. Só fala com o motor.
- O container hub não executa IA local em nenhuma hipótese.
- A credencial do Jesse nunca atende request que venha do subdomínio `app.`.
- Troca de motor de um workspace é ação do CORE, auditada, com efeito nas próximas sessões (as abertas terminam no motor de origem, como o 2.x já faz com sessões presas ao motor).

## Estado da execução em 2026-07-23

Implementado no repositório:

- Gemini e Claude Team com faixas econômica, padrão e forte configuráveis por ambiente.
- Tokens finais e custo estimado por modelo registrados inclusive nos testes administrativos.
- Claude Team exige consentimento, cofre, teste válido e isolamento por workspace.
- Seleção administrativa bloqueia Gemini sem Vertex e Claude Team sem credencial válida.
- Falha de autenticação vira manutenção e mensagem segura.
- Meu Claude consulta e testa a CLI exclusiva do CORE, com login persistente no volume.

Pendente externo: executar Gemini e Claude Team com credenciais reais na VM, configurar quotas do projeto e guardar a evidência do teste.
