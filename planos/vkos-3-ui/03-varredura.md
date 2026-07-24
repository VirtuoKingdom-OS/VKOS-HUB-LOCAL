# VKOS 3.0 UI, varredura tela a tela

## Inventário

A fonte de verdade é `interno/mapa-telas.json` (23 telas do 2.x, com zonas e jornadas), mais as que faltam nele: **Acesso** (bootstrap, login, convite, redefinição) e **Administração** (modelos, clientes, detalhe do workspace). Primeiro passo da varredura é atualizar o mapa com essas duas (ver P0.4) e usar o mapa atualizado como checklist. Se durante a varredura surgir tela fora do mapa, ela entra no mapa na mesma tarefa.

## Método de verificação (obrigatório, por tela)

O repositório já tem `playwright-core` como dependência do server. Criar um script utilitário `infra/varredura-ui.mjs` que:

1. Sobe contra o app rodando (CORE 4600, hub 4601).
2. Faz login (operador no CORE, cliente no hub) usando as credenciais de smoke.
3. Para cada tela do inventário: navega pro hash, espera a rede assentar, e tira screenshot nas três larguras (390x740, 768x1024, 1440x900) nos dois temas. 12 imagens não, 6 por tela: 3 larguras x 2 temas.
4. Falha alto se detectar overflow horizontal (`document.documentElement.scrollWidth > innerWidth`) ou erro de console.
5. Salva tudo em `analises/varredura-ui/<data>/`.

O executor olha cada screenshot de verdade, um por um. Screenshot com problema gera correção e novo screenshot. A varredura de uma tela só fecha com as 6 imagens limpas.

## Checklist por tela

Pra cada tela, nesta ordem:

1. **Funciona**: abre sem erro de console, dados carregam, ações principais respondem.
2. **Estados**: vazio (workspace novo), carregando (skeleton), erro (servidor derrubado responde com EstadoErro, não tela cinza). Os três verificados de verdade, não presumidos.
3. **Responsividade**: as três larguras sem overflow do body, sem conteúdo cortado sem scroll, alvos de toque de 44px no celular.
4. **Temas**: os dois temas sem cor hardcoded, contraste 4.5:1 no corpo (conferir com ferramenta, não no olho).
5. **Sistema**: migrada pros componentes comuns (botão, campo, cartão, aba, modal, estados), CSS local reduzido a layout, tokens de escala aplicados, proibições do `00-visao.md` removidas.
6. **Motion**: transições nos tokens de duração, reduced-motion respeitado.

## Ordem de varredura (por impacto no ciclo 3.0)

1. **Acesso** (bootstrap com QR, login, convite, redefinição). É a porta do produto.
2. **Administração** (modelos, clientes, detalhe de workspace, consumo). É o coração do CORE.
3. **Dashboard e Sidebar/Shell** (navegação, seletor de workspace, seletor de tema com dois temas).
4. **CRM** (Hoje, Quadro, Contatos, ficha, Buscar leads). Tela mais densa do app.
5. **Cockpit** (canvas, nós, sessões). Cuidado especial: React Flow tem containers próprios, testar zoom e pan.
6. **Criador Visual** (Dashboard de criação, wizard, Studio de carrossel).
7. **Site Guiado** (wizard, TelaSite, Studio de site, publicação).
8. **Calendário, Automações, Conexões, Fontes, Galerias**.
9. **IDE** (janela flutuante: testar redimensionada, minimizada e em tela pequena).
10. **Mapa de sistema e Mapa de telas** (canvas com muitos nós, performance).
11. **Cerimônia do Cérebro e Onboarding**.
12. O que sobrar do mapa.

## Estados globais (fora de tela específica)

- Splash e ServidorForaDoAr.
- Error boundary novo (P0.2) nos dois temas.
- Página 404 de hash desconhecido (hoje cai no dashboard em silêncio; conferir se é o comportamento desejado e manter consistente).
- Scrollbar, seleção de texto e focus-visible nos dois temas.
