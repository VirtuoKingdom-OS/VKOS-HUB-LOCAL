# VKOS 3.0, segurança

Segurança aqui não é uma camada no fim, é requisito de aceitação de cada fase. Cada item abaixo tem que estar verificável antes do primeiro cliente real entrar.

## Modelo de ameaças

1. **Cliente tenta acessar dados de outro workspace.** É a ameaça número um de qualquer sistema multi-cliente.
2. **Cliente tenta alcançar o Claude do Jesse ou o cofre.** Seja por bug de autorização, seja por injeção de caminho.
3. **Vazamento de credencial** (chave Gemini, credencial Claude Team de cliente, tokens de conexões como GitHub e Netlify).
4. **VPS comprometida** (SSH fraco, porta aberta, pacote vulnerável).
5. **Abuso de custo de IA** (cliente ou atacante gerando consumo sem limite na conta do Jesse).
6. **Perda de dados** (disco, erro humano, ransomware).

## Controles por ameaça

### 1. Isolamento entre workspaces

- Todo request do hub passa por um middleware único que resolve sessão, usuário, workspace e features ativas. Negar por padrão: rota sem workspace resolvido responde 401, feature inativa responde 404.
- O caminho da pasta do workspace é sempre resolvido pelo servidor a partir do id no banco. Nenhum caminho vem do cliente. Teste automatizado de path traversal (`../`) obrigatório.
- Ids de workspace são aleatórios (não sequenciais), mas a autorização nunca depende disso.
- Testes de regressão de isolamento: usuário A logado tenta cada rota da API com o workspace de B, tudo tem que negar.

### 2. Separação física do CORE

- A credencial Claude do Jesse vive num volume montado só no container core. O container hub não tem esse volume, não tem o binário do Claude e não tem rota de rede pro core.
- O cofre de credenciais de clientes é montado só no motor e no core.
- O motor só aceita conexões da rede interna do compose. Sem porta pública.
- `core.dominio.com` exige TOTP sempre. Allowlist de IP opcional como segunda tranca.

### 3. Credenciais e cofre

- Valores cifrados em repouso com AES-256-GCM. A chave mestra vive no Secret Manager do Google e é lida no boot, nunca escrita em disco nem em variável visível em log.
- Credencial nunca aparece em log, em resposta de API nem em tela (mostrar só os quatro últimos caracteres).
- Rotação: trocar credencial de um workspace é uma ação do CORE, auditada.
- Tokens de conexões externas (GitHub, Netlify, Apify, Google) seguem a mesma regra, escopados por workspace, como já é no 2.x.
- Credencial Claude Team de cliente: guardada com consentimento registrado (data e texto do aceite na auditoria), conforme a decisão de compliance de 2026-07-22.

### 4. Hardening da VPS

- SSH só com chave, sem senha, sem root direto. Porta padrão trocada ou com fail2ban.
- Firewall (regra do GCP): só 80, 443 e a porta do SSH abertas.
- Atualizações de segurança automáticas no SO (unattended-upgrades).
- Containers rodam com usuário não root e filesystem read-only onde der.
- Caddy com headers: HSTS, X-Content-Type-Options, X-Frame-Options, CSP básica.
- Sem telemetria de terceiros no app dos clientes.

### 5. Autenticação e sessão

- Operador: senha forte + TOTP obrigatório. Cinco erros seguidos bloqueiam por 15 minutos.
- Cliente: convite por link com expiração, senha com Argon2id, reset por email com token de uso único.
- Sessão: cookie httpOnly, Secure, SameSite=Lax, expiração deslizante de 7 dias no hub e 24 horas no core.
- Rate limit por IP nas rotas de login e de IA.
- Logout remoto: o CORE pode derrubar todas as sessões de um workspace (cliente saiu, inadimplência, suspeita).

### 6. Limites de custo de IA

- Todo workspace tem orçamento mensal em `limites_workspace`. Estourou: avisa o Jesse e, se configurado, corta a IA daquele workspace (as demais features seguem funcionando).
- O consumo é registrado por sessão no `consumo_ia`, visível no CORE por workspace e por mês.
- A service account do Vertex tem quota configurada no próprio GCP como teto absoluto.

### 7. Backup e recuperação

- Diário: dump do Postgres + tar das pastas `/dados`, cifrado, enviado ao Cloud Storage com versionamento e retenção de 30 dias.
- Teste de restauração faz parte da fase 4: restaurar um backup numa VM limpa e ver o sistema subir. Backup não testado não conta.
- Os princípios de dado sagrado do 2.x continuam no nível de aplicação (quarentena, migração sem descarte).

## Auditoria

Registrar em `auditoria`: logins (sucesso e falha), criação e alteração de workspace, mudança de feature, troca de motor, acesso a credencial, sessões derrubadas, restauração de backup. O CORE tem uma tela simples de leitura desse log, filtrável por workspace.

## O que fica explicitamente proibido

- Qualquer caminho de código em que o hub execute IA localmente.
- Credencial em variável de ambiente de container do hub.
- Endpoint de administração acessível pelo subdomínio `app.`.
- Log com corpo de credencial, senha ou token, mesmo truncado pela metade.
