# Fechamento do MVP local: riscos e decisões abertas

## Riscos técnicos

1. **O Codex CLI muda rápido.** Flags, formato do JSONL, nomes de modelo e comportamento de sandbox mudam entre versões. Mitigação: os PONTOS DE VERIFICAÇÃO da peça 3 são obrigatórios antes de codar, a versão testada fica registrada no relatório da M2, e o tradutor de eventos concentra o acoplamento num arquivo só (`provedores/codex.ts`). Se uma atualização do CLI quebrar o hub, o conserto é num lugar só.
2. **Sandbox do Codex no Windows.** Historicamente o sandbox do Codex é mais maduro em unix. Se o modo de permissão "padrao" (escrever só no workspace) não funcionar direito no Windows, o MVP pode precisar rodar o Codex em modo equivalente ao "total" com aviso claro ao usuário. Isso é uma DECISÃO DO JESSE se acontecer: o executor apresenta o achado e as opções, não decide sozinho.
3. **Fidelidade das skills no Codex.** As skills do VKOS foram escritas e calibradas pro Claude. No Codex elas entram por expansão de prompt (ler e seguir o SKILL.md), que funciona mas não é idêntico (sem o carregamento nativo, sem as convenções do Claude Code). Risco aceito no MVP: o Cérebro e a metodologia valem nos dois; a régua de qualidade por motor é assunto de iteração com uso real. Anotar no relatório da M2 QUALQUER caso em que a saída do Codex ignorar o SKILL.md.
4. **Custo estimado nunca vira promessa.** A tabela `precos-codex.json` envelhece. Mitigação: rótulo "estimado" na interface, arquivo editável sem recompilar, fonte e data no topo do arquivo. Nunca apresentar o estimado com cara de exato.
5. **Resume no Codex.** Se a versão instalada não tiver retomada headless, o fallback de recapitulação muda o custo (reenvia contexto) e pode mudar a qualidade da continuação. Mitigação: fallback documentado, e o custo da recapitulação entra na estimativa.
6. **Login dos CLIs.** Os fluxos de login abrem navegador e mexem em credenciais locais, e mudam de nome de comando entre versões. O hub NUNCA guarda credencial de IA: só dispara o comando do CLI num terminal visível e confere o status. Se um CLI mudar o comando de login, a jornada quebra num ponto só (rota `POST /ambiente/login`).
7. **A refatoração da M1 é no coração do app.** Qualquer regressão no motor de sessão quebra tudo. Mitigação: a M1 não muda comportamento por definição, o QA dela é regressão pura, e ela fecha sozinha antes de o Codex entrar.
8. **Porta 4600 ocupada por outro programa.** O Iniciar detecta "porta responde" e assume que é o hub. Mitigação mínima no MVP: o request de checagem valida uma rota do hub (ex: `GET /ambiente` respondendo o shape esperado), não só a porta aberta. Se outro processo ocupar a 4600, mensagem honesta e instrução de fechar o outro programa (config de porta é evolução, não MVP).
9. **Antivírus e SmartScreen.** `.cmd` baixado da internet assusta o Windows (aviso de editor desconhecido). Risco aceito no MVP: o LEIA-ME de usuário final explica o aviso em linguagem simples. Empacotamento assinado é evolução.
10. **Node ausente na máquina do cliente.** O Instalar não instala o Node sozinho (winget nem sempre existe, permissões variam). Ele abre o site oficial e instrui. É um degrau real na jornada do leigo: aceito no MVP, candidato número um de melhoria (empacotar um runtime) se travar vendas.

## Riscos de produto

11. **Dois motores dobram a superfície de teste.** Cada feature nova daqui pra frente precisa pensar "e no Codex?". Mitigação: o contrato de provedor força a pergunta no lugar certo, e as limitações aceitas (MCP só no Claude) ficam escritas no CONTRATO.md pra nenhuma sessão futura "consertar" sem querer.
12. **Vazamento de dados do Jesse no pacote.** O repositório hoje tem dados reais (clientes, backups). Se o zip de distribuição sair errado, vaza dado de cliente. Mitigação: limpeza do git na M3 (com aprovação do Jesse), checklist de pacote explícito, e a regra: a pasta distribuída nasce do checklist, nunca de "zipar a pasta toda".
13. **Suporte.** Usuário leigo + máquina desconhecida = pedidos de ajuda. O LEIA-ME cobre os problemas previsíveis (Node, porta, antivírus, login). O resto é aprendizado de campo do build in public.

## Decisões que o executor NÃO toma sozinho (leva pro Jesse)

- Sandbox do Codex insuficiente no Windows (risco 2): como degradar.
- Qualquer necessidade de mudar o dialeto de eventos congelado (se o mapeamento da M1 revelar uma dependência feia do frontend).
- O texto dos cards de escolha de motor (preço e requisitos de cada assinatura mudam; o executor propõe, o Jesse bate o martelo).
- Executar o `git rm --cached` e o commit da limpeza (o executor só prepara).

## O que este plano NÃO resolve (pra ninguém esticar o escopo)

- mac e linux.
- MCP no Codex.
- Outros provedores além dos dois.
- Instalador gráfico assinado.
- Atualização automática do hub (o usuário baixa a pasta nova por enquanto).
- O plano `planos/whatsapp` (independente; se rodar depois deste, o transporte de sessão de lá nasce sobre o contrato de provedor).
