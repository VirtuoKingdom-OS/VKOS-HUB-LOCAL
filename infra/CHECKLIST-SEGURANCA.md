# Checklist de segurança da implantação

Estado do repositório em 2026-07-23. Itens externos precisam ser assinados durante a implantação.

| Controle | Estado | Evidência |
|---|---|---|
| CORE e Hub separados | verificado no repositório | serviços e redes distintos no `docker-compose.yml` |
| Hub sem Claude local | verificado no repositório | imagem `hub` não instala CLI nem monta `claude_core` |
| Segredo do motor fora do Hub web | verificado no repositório | somente token opaco chega ao Hub, chave mestra fica no motor e CORE |
| Credencial por workspace | verificado no repositório | cofre AES-256-GCM, consulta por `workspace_id` e auditoria |
| Gemini com conta mínima | verificado no Terraform | conta exclusiva com `roles/aiplatform.user` |
| Backup com conta mínima | verificado no Terraform | conta exclusiva com `roles/storage.objectCreator` no bucket |
| Banco sem porta pública | verificado no Compose | rede interna, sem `ports` |
| Motor sem porta pública | verificado no Compose | rede interna, sem `ports` |
| Metadata da VM bloqueado para containers | verificado no script | regra `DOCKER-USER` em `hardening-ubuntu.sh` |
| SSH sem senha e sem root | verificado no script | `hardening-ubuntu.sh` |
| Firewall do host | verificado no script | UFW libera somente SSH, 80 e 443 |
| Firewall do GCP | verificado no Terraform | 80 e 443 públicos, 22 limitado por CIDR |
| TLS e cabeçalhos | verificado no repositório | Caddy automático, HSTS, CSP, anti-frame e nosniff |
| Rate limit e bloqueio de login | coberto por aplicação | autenticação central do servidor |
| TOTP do operador | coberto por aplicação | Administração, Segurança |
| Preço inválido não gera custo falso | coberto por teste | `modelos.test.ts` |
| Erro externo não vaza credencial | coberto por teste | `estadoMotor.test.ts` |
| Credencial Claude exige consentimento e teste | coberto por regra | rotas administrativas e `regrasMotores.test.ts` |
| Orçamento com corte | verificado no repositório | broker consulta consumo antes da sessão |
| Terraform válido | verificado localmente | `terraform fmt -check` e `terraform validate` com Terraform 1.13 |
| Dependências sem risco alto ou crítico conhecido | verificado localmente | `npm audit --omit=dev` em 2026-07-23 |
| DNS e TLS públicos | pendente externo | executar seções 1 e 4 do runbook |
| Quota e orçamento do GCP | pendente externo | registrar limites escolhidos no projeto |
| Claude do CORE após reinício | pendente externo | seção 5 do runbook |
| Gemini real na VM | pendente externo | seção 6 do runbook |
| Restauração em ambiente limpo | pendente externo | seção 7 do runbook |

## Riscos transitivos acompanhados

O `npm audit --omit=dev` ainda aponta quatro ocorrências moderadas em duas cadeias transitivas:

- `@hono/node-server` vem do SDK MCP. O aviso afeta `serve-static` no Windows; a produção roda Linux e o VKOS não usa esse servidor estático.
- `uuid` vem de `gaxios` pela biblioteca de autenticação Google. O caso vulnerável exige as APIs UUID v3, v5 ou v6 com buffer fornecido, que não são chamadas pelo VKOS.

Não foi aplicado `npm audit fix --force`: a correção sugerida rebaixa o SDK MCP e é uma mudança incompatível. Atualizar quando as dependências diretas publicarem uma resolução compatível.
