# Fechamento do MVP local: motor multi-IA (Claude + Codex) e inicializador de um clique

## Contexto

O hub roda só com Claude (`claude -p`) e só o Jesse sabe ligar (npm, build, porta). Pra fechar a base de produto vendável do build in public, o Jesse pediu a grande atualização: rodar também com o Codex/ChatGPT e ter uma jornada de instalação que um leigo completa sozinho, com um arquivo único pra iniciar no dia a dia.

## Decisão

1. Contrato interno de provedor de IA (`app/server/src/provedores/`) com duas implementações: Claude (o motor atual, refatorado sem mudança de comportamento) e Codex (`codex exec` com tradução de eventos). O dialeto de eventos do hub é o stream-json do Claude: o adaptador do Codex traduz pra ele.
2. Limitações aceitas do MVP, sempre visíveis na interface: MCP só no Claude; custo do Codex é estimado por tokens; skills entram no Codex por expansão de prompt (ler e seguir o SKILL.md) e AGENTS.md gerado do CLAUDE.md.
3. Jornada de primeira execução dentro do hub (tela #/setup): escolher o motor, detectar o CLI, login, teste real, atalho. Dois arquivos na raiz: `Instalar VKOS Hub.cmd` (uma vez) e `Iniciar VKOS Hub.cmd` (o dia a dia). Alvo do MVP: Windows.
4. Portabilidade do pacote: dados do Jesse fora do git, CONTRATO.md com o contrato de provedor, LEIA-ME de usuário final, checklist do que a pasta distribuída contém.
5. O plano completo vive em `docs/planos/fechamento-mvp/` (rodadas M1, M2, M3), escrito pra QUALQUER IA executar (caminhos relativos, pontos de verificação de CLI, modo sequencial pra executor sem agentes paralelos).

## Por quê

- Metade do público-alvo assina ChatGPT, não Claude. Um motor só corta o mercado ao meio.
- O produto é local-first e pagamento único: a instalação É o produto na primeira impressão. Se precisar de terminal, o público-alvo desiste.
- O dialeto do Claude como norma evita reescrever o frontend inteiro e mantém o raio de explosão da mudança dentro do server.
- Plano executável por qualquer IA é coerente com o próprio produto multi-IA e protege o projeto de depender de uma ferramenta só.
