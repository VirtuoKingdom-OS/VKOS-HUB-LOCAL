# VKOS 3.0, execução em fases

Ordem obrigatória. Cada fase fecha com typecheck, testes e build verdes (`npm run checar`, `npm run testar`, `npm run build -w web`), mais o critério próprio. Não pular fase.

## Regras para quem executa (vale para qualquer IA ou pessoa)

- Ler `CLAUDE.md`, `contexto/visao.md`, `contexto/arquitetura.md` e `contexto/roadmap.md` antes de começar.
- Português brasileiro em tudo. Sem travessão e sem ponto centrado, usar vírgula, ponto ou dois-pontos.
- Cor só por token (`global.css` define a base, `visual-hub.css` fecha o valor por tema). Tudo funciona nos três temas.
- NUNCA commit, push ou PR sem ordem explícita do Jesse.
- Dado de workspace real (ojessegomes, estudio-aura, app/dados) é sagrado: nunca apagar, nunca sobrescrever às cegas, na dúvida quarentena com data.
- Ao fechar cada fase: atualizar `contexto/arquitetura.md` e `contexto/roadmap.md` na linha certa, atualizar `interno/mapa-sistema.json` se módulo ou fluxo mudou, e registrar decisão nova em `decisoes/` se houve escolha relevante.
- Segurança é critério de aceitação, não etapa final: os testes de isolamento da fase 1 rodam em todas as fases seguintes.

## Fase 0: limpeza e reorganização

Ver lista concreta em `06-limpeza-e-migracao.md`.

- Remover o instalável e o setup local (instaladores já removidos da raiz em 2026-07-22, falta o código: tela `#/setup`, rotas de instalação no server, detecção de motores locais).
- Reorganizar `app/` para a estrutura de features com manifesto, movendo código sem mudar comportamento.
- Introduzir a variável `MODO` (`core` | `hub`) com o 2.x inteiro rodando como `core`.
- Atualizar README e CHANGELOG para a era 3.0.

Fecha quando: o app roda igual ao 2.x em `MODO=core`, testes verdes, nada de instalável no código.

## Fase 1: identidade e autorização

- Postgres no compose de desenvolvimento, migrações versionadas.
- Tabelas de `01-arquitetura.md`. 
- Login do operador com senha + TOTP. Login de cliente com convite, Argon2id, reset por email.
- Middleware único de autorização no server: sessão, papel, workspace, features. Negar por padrão.
- Testes de isolamento: usuário A contra workspace de B em todas as rotas, path traversal, feature desligada respondendo 404.

Fecha quando: os testes de isolamento passam e o Jesse loga com TOTP num ambiente local.

## Fase 2: features com manifesto e flags

- Manifesto por feature conforme `03-features-e-modelos.md`, registrando as 12 features do inventário.
- Menu e rotas montados a partir das features ativas do workspace.
- Tela Modelos e tela Clientes no CORE, com as três ações separadas: criar modelo, criar workspace, liberar login.
- Interruptor de feature com efeito imediato no hub (o front consulta as flags ao navegar, sem redeploy).

Fecha quando: o Jesse cria um modelo, instancia um workspace, desliga uma feature e vê ela sumir na hora.

## Fase 3: motor de IA como serviço

- Extrair o broker conforme `04-motores-ia.md`, mantendo o formato de eventos do 2.x.
- Implementar `gemini` via Vertex AI com metering em `consumo_ia` e limites por workspace.
- Implementar `claude_team` com credencial do cofre.
- Cofre com AES-256-GCM e chave mestra externa.
- `MODO=hub` sem provedor local: qualquer tentativa de IA local em modo hub falha em teste.

Fecha quando: uma feature roda uma sessão completa com Gemini num workspace de teste, o consumo aparece no CORE e o hub comprovadamente não executa IA local.

Estado em 2026-07-23: código, testes locais, medição, orçamento, estados e interface administrativa implementados. O teste real do Gemini aguarda credencial Vertex e VM.

## Fase 4: VPS e hardening

- Docker Compose de produção: caddy, core, hub, motor, postgres, backup.
- VM no Compute Engine, DNS, TLS, firewall, SSH por chave, unattended-upgrades, fail2ban.
- Secret Manager para a chave mestra. Volumes separados conforme a arquitetura.
- Backup diário cifrado pro Cloud Storage e um teste real de restauração em VM limpa.
- Checklist completo de `02-seguranca.md` verificado item a item, com evidência.

Fecha quando: o Jesse acessa `core.` de outra rede, loga com TOTP e usa o Claude dele; `app.` responde com TLS válido; o backup restaurado sobe.

Estado em 2026-07-23: Compose, Terraform, hardening, backup, `infra/RUNBOOK-VPS.md` e checklist estão prontos. DNS, TLS público, login do Claude e restauração em VM limpa continuam pendentes externos.

## Fase 5: primeiro cliente de ponta a ponta

- Criar um modelo real, instanciar workspace, configurar Gemini, liberar convite.
- Cliente (pode ser uma conta de teste do Jesse noutro dispositivo) entra, usa uma feature com IA, gera uma peça.
- Jesse acompanha consumo, testa suspender e reativar o workspace, derruba a sessão remota.

Fecha quando: o critério de sucesso de `00-visao.md` acontece de verdade, sem gambiarra.

## Depois do plano (fora desta rodada)

Migração opcional para Cloud Run, billing automatizado, cor de marca por workspace, features novas (whatsapp, instagram, analytics, estoque, financeiro) via manifesto.
