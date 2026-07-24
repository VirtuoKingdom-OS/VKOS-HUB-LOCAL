# VKOS 3.0, arquitetura

## Princípio de ouro

O runtime que atende cliente nunca tem acesso ao Claude pessoal do Jesse, nem ao cofre inteiro de credenciais. Essa separação é física (containers e volumes distintos), não só lógica (um if no código). Um bug de autorização no app do cliente não pode alcançar a credencial do Jesse porque ela não está montada ali.

## Topologia de serviços

Tudo containerizado com Docker Compose numa VM do Google Compute Engine. Portável: o mesmo compose sobe em qualquer VPS com Docker. Migração futura para Cloud Run é possível porque os serviços já nascem separados.

```
                        internet
                           |
                     [ caddy ]  TLS automático, roteamento por subdomínio
                      /        \
        core.dominio.com     app.dominio.com
              |                    |
          [ core ]              [ hub ]
     painel do Jesse       app dos clientes
     tem Claude CLI        sem Claude CLI
     tem credencial dele   sem cofre
              \                /
               \              /
                [ motor ]          [ postgres ]
           broker de IA            identidade, config,
           único que lê o          flags, auditoria,
           cofre de clientes       consumo
                |
           [ backup ]  cron diário: dump + pastas, cifrado, para o GCS
```

### caddy

Proxy reverso com TLS automático (Let's Encrypt). Roteia `core.` para o container core e `app.` para o container hub. Aplica headers de segurança e rate limit básico. Allowlist de IP opcional no `core.`.

### core (o painel do Jesse)

- O mesmo monorepo atual (Fastify + React), rodando com `MODO=core`.
- Único container com o binário do Claude Code e a credencial do Jesse (login oficial feito uma vez na VM, volume próprio, montado só aqui).
- Tem todas as features habilitadas para uso próprio (os workspaces internos atuais: ojessegomes, estudio-aura, vkos).
- Tem as telas de administração: modelos de workspace, workspaces de clientes, logins, features por workspace, motor por workspace, consumo, auditoria.
- Autenticação: senha forte + TOTP obrigatório. Um único usuário operador.

### hub (o app dos clientes)

- Mesmo monorepo, rodando com `MODO=hub`.
- Sem binário de IA, sem credencial montada, sem acesso ao volume do core.
- Serve só as features que o workspace do usuário logado tem ativas. Feature desligada não aparece no menu e as rotas de API dela respondem 404 para aquele workspace.
- Toda sessão de IA é pedida ao motor via rede interna, nunca executada localmente.

### motor (broker de IA)

- Serviço interno, sem porta pública. Só aceita chamadas do core e do hub pela rede interna do compose.
- Recebe `{ workspaceId, pedido, contexto }`. Resolve no banco qual motor aquele workspace usa, busca a credencial no cofre, executa e devolve o stream.
- Motores suportados: `gemini` (Vertex AI, service account do projeto do Jesse), `claude_team` (credencial do seat próprio do cliente, guardada no cofre), `nenhum` (features de IA ficam ocultas).
- Registra consumo por sessão em `consumo_ia` (tokens, custo estimado) para o Jesse cobrar e limitar.
- É o único serviço que monta o volume do cofre de credenciais de clientes.

### postgres

Identidade e configuração. Os dados de trabalho dos workspaces continuam em pastas (ver abaixo).

## Modelo de dados (Postgres)

- `usuarios`: id, email, hash_senha (Argon2id), papel (`operador` | `cliente`), totp_secret (obrigatório para operador), status, criado_em.
- `modelos_workspace`: id, nome, descricao, features_json (lista de features e configs iniciais), motor_padrao, criado_em.
- `workspaces`: id, nome, slug, modelo_origem_id (nulo se criado do zero), motor (`claude_team` | `gemini` | `nenhum`), status (`ativo` | `suspenso`), pasta, criado_em.
- `membros_workspace`: usuario_id, workspace_id, papel (`dono` | `membro`). Cliente só enxerga workspaces onde é membro.
- `features_workspace`: workspace_id, feature_id, ativa, config_json. Alterável a quente pelo CORE.
- `credenciais`: id, workspace_id, tipo (`claude_team` | `gemini` | `conexao_externa`), valor_cifrado, criado_em. Cifrado com chave mestra que só o motor e o core conhecem.
- `convites`: token, workspace_id, email, expira_em, usado_em.
- `auditoria`: id, usuario_id, acao, alvo, detalhes_json, ip, criado_em. Toda ação administrativa do CORE e todo login entram aqui.
- `consumo_ia`: id, workspace_id, sessao_id, motor, modelo, tokens_entrada, tokens_saida, custo_estimado, criado_em.
- `limites_workspace`: workspace_id, orcamento_mensal, acao_ao_estourar (`avisar` | `cortar`).

## Sistema de arquivos

O modelo de pastas atual se mantém, agora com fronteira clara:

```
/dados
  core/                      workspaces internos do Jesse (montado só no core)
    ojessegomes/
    estudio-aura/
    vkos/
  clientes/                  montado no core (leitura e escrita) e no hub
    <workspace-id>/          (cada request do hub só alcança a pasta do
      cerebro/                workspace do usuário logado, validado no
      pecas/                  middleware, caminho sempre resolvido pelo
      sites/                  servidor, nunca vindo do cliente)
      crm/
      calendario/
      automacoes/
  cofre/                     credenciais cifradas (montado só no motor e core)
  backups/                   staging local antes de subir pro GCS
```

Regras herdadas do 2.x que continuam valendo: quarentena de arquivo corrompido com data, migração sem descarte, validação Zod na borda de cada arquivo.

## Como o mesmo código vira dois apps

- Um único monorepo `app/` com `server/`, `web/` e a nova pasta `features/` (ver `03-features-e-modelos.md`).
- A variável `MODO` (`core` | `hub`) decide na subida: quais rotas administrativas existem, se o provedor Claude local está disponível, qual bundle o front carrega.
- O front usa o mesmo design system e os três temas. O hub dos clientes pode ganhar cor de marca por workspace depois, sempre via tokens.

## Google Cloud, peças usadas

- Compute Engine: a VM que roda o compose. Começar com e2-standard-2, disco de 50 GB, subir conforme uso.
- Vertex AI: Gemini para os workspaces de clientes. Service account com papel mínimo (só Vertex), chave nunca dentro dos containers de hub, só no motor.
- Cloud Storage: destino dos backups cifrados e, no futuro, dos assets pesados.
- Secret Manager: guarda a chave mestra do cofre e segredos do compose. A VM lê no boot com a service account dela.
- Cloud DNS ou o registrador atual: apontar `core.` e `app.` para o IP fixo da VM.

## O que fica de fora desta rodada

- Cloud Run e escala horizontal: os contratos ficam prontos, a migração é rodada futura.
- Pagamento automatizado (billing do cliente): o Jesse cobra por fora, o sistema só mede consumo e aplica limites.
- WhatsApp, Instagram, estoque e financeiro: entram depois como novas features no mesmo sistema de manifesto. O plano só garante que o encaixe existe.
