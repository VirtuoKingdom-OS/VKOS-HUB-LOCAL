# VKOS 3.0 na nuvem, visão

Plano criado em 2026-07-22. Decisão registrada em `decisoes/2026-07-22-vkos-3-nuvem.md`. Este plano redesenha o VKOS Hub para rodar numa VPS (Google Cloud como casa preferida, mas portável para qualquer provedor), mantendo todas as capacidades já construídas.

## O que o VKOS 3.0 é

Uma plataforma com dois lados que compartilham o mesmo código de features:

1. **VKOS HUB CORE**: o painel interno do Jesse. Só ele tem login. É onde vive o Claude pessoal dele (a credencial dele, usada só por ele, o que é permitido pelos termos da Anthropic). No CORE ele trabalha nos projetos próprios, cria modelos de workspace, cria workspaces de clientes, libera logins, liga e desliga features e escolhe o motor de IA de cada cliente.

2. **Workspaces de clientes**: cada cliente recebe login para o workspace dele, acessado pelo navegador. O workspace é montado a partir de um modelo, com as features que o Jesse habilitou. O motor de IA do cliente nunca é o Claude do Jesse: é um Claude Team com credencial própria do cliente (guardada com segurança no cofre) ou o Gemini via Google Cloud, faturado e medido pelo Jesse.

O trabalho do cliente é pagar o Jesse. O trabalho do Jesse é entregar tudo funcionando. A infraestrutura, as credenciais e a configuração ficam invisíveis para o cliente.

## Conceitos centrais

- **Feature (módulo lego)**: cada capacidade atual do hub (Cockpit, Criador de Conteúdo Visual, Site Guiado e Studio, CRM, Calendário, Automações, Conexões, Leads, IDE) vira um módulo com manifesto próprio, que pode ser ligado ou desligado por workspace. Elas continuam interconectadas pelo barramento de eventos quando ativas juntas.
- **Modelo de workspace**: uma receita. Define quais features vêm ligadas, o motor padrão e configurações iniciais. Exemplo: modelo "Automobilístico" com site, carrosséis, CRM com WhatsApp, Instagram, analytics, estoque e financeiro. Modelo não tem login nem dados de cliente.
- **Workspace de cliente**: uma instância viva criada a partir de um modelo. Tem pasta própria de dados, logins próprios, motor próprio, features que podem ser alteradas a quente pelo CORE.
- **Motor por workspace**: o CORE resolve qual motor cada workspace usa. O código de feature nunca conhece credencial, só pede "uma sessão de IA deste workspace" ao serviço motor.

## O que não muda

- Dado do usuário é sagrado: quarentena, migração sem descarte, backup.
- Dado pessoal de cliente nunca entra em peça publicável.
- Geração é verificada, não confiada.
- Português brasileiro, tokens de tema, três temas, motion sutil.
- No fundo, cada workspace continua sendo uma pasta com Cérebro, peças e dados. O modelo mental de pastas se mantém.

## O que muda

- Sai o instalável local para leigo (fase 8 antiga). O produto vira acesso pelo navegador.
- Entra identidade real: logins, papéis, convites, auditoria.
- Entra o cofre de credenciais e o serviço motor (broker de IA).
- Entra o deploy em VPS com TLS, backup e hardening.
- O multi-cliente atual (workspaces internos do cockpit) evolui para o conceito de workspace com login de cliente.

## Critério de sucesso do plano

O plano fecha quando: o Jesse acessa o CORE de qualquer lugar pelo navegador, usa o Claude dele lá dentro, cria um modelo, instancia um workspace de cliente, libera um login, o cliente entra de outra máquina, usa uma feature com Gemini, e o Jesse desliga uma feature e vê ela sumir da tela do cliente sem redeploy.
