# Login sem fricção: local direto, produção com senha, TOTP opcional

## Contexto

A fase 1 do plano da nuvem implementou cadastro de operador com TOTP obrigatório. No primeiro uso local, o Jesse rejeitou a fricção: criar usuário e configurar autenticador pra abrir o próprio painel na própria máquina não faz sentido.

## Decisão

1. **Local (sem `PRODUCAO=1`)**: o CORE abre direto, sem cadastro, senha ou TOTP, como o 2.x. O hub local mantém o login de cliente, que é o que precisa ser testado.
2. **Produção (VPS)**: o primeiro acesso cria só a senha do operador (mínimo 12 caracteres). TOTP deixa de ser obrigatório e vira opção que o Jesse liga quando quiser, numa tela de segurança do CORE.
3. Proteções permanentes em produção: rate limit no login, bloqueio por 5 tentativas, sessão curta no CORE, auditoria de acessos e allowlist de IP opcional no Caddy.

## Por quê

- Fricção no dono do produto é custo diário; o risco local é o da própria máquina dele, que já é o perímetro do 2.x.
- Trade-off aceito com clareza: senha sem TOTP protege menos que senha com TOTP. As mitigações (rate limit, bloqueio, allowlist de IP, auditoria) reduzem o risco, e o TOTP fica a um clique quando o CORE estiver exposto na internet de verdade.
