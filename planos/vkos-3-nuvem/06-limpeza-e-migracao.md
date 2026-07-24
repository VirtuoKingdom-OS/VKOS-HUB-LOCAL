# VKOS 3.0, limpeza e migração do repositório

Backup feito: o Jesse copiou a pasta em 2026-07-22 e o histórico está no git. Mesmo assim, nada aqui apaga dado de workspace real.

## Já feito em 2026-07-22

- Removidos da raiz: `Instalar VKOS Hub.cmd`, `Iniciar VKOS Hub.cmd`, `LEIA-ME.md`.

## Renomear a pasta (ação manual do Jesse)

A pasta raiz `VKOSAPPv2` vira `VKOSAPPv3` (ou o nome que o Jesse preferir). Tem que ser manual porque a pasta fica travada enquanto VS Code, Claude Code e o dev server estão abertos dentro dela. Passos: fechar tudo, renomear no Explorer, reabrir. O git não se importa com o nome da pasta.

## Remover na fase 0 (código e docs do instalável local)

- Tela `#/setup` no front e componentes associados.
- Rotas e lógica de instalação e detecção de motores locais no server (o que servia os `.cmd`).
- Referências ao pacote instalável, ao ZIP e à "segunda máquina Windows limpa" no README, CHANGELOG e contexto.
- A pendência antiga de `git rm` dos 138 arquivos privados do pacote: revisar se ainda se aplica, o pacote público deixou de ser o canal.

## Manter, mudando de papel

- `vkos2/`: deixa de ser "template do pacote do cliente" e vira o primeiro conteúdo semente de modelo de workspace.
- `ojessegomes/`, `estudio-aura/`, `vkos/`: viram os workspaces internos do CORE, futuros moradores de `/dados/core/` na VPS. No repositório local seguem onde estão até a fase 4.
- `app/dados/`: continua fora do versionamento, sagrado.
- `contexto/`, `decisoes/`, `interno/`, `analises/`: continuam como estão, são o cérebro do desenvolvimento.
- `COMECE-AQUI.md`: continua, é orientação de quem desenvolve.
- `outros/`: continua fora do versionamento.
- `logo.png.png`: renomear para `logo.png` quando conveniente.

## Atualizar na fase 0

- `README.md`: nova estrutura, novo modo de rodar (compose de desenvolvimento), remoção da seção de distribuição por pacote.
- `CHANGELOG.md`: abrir a era 3.0.0 com a entrada da decisão.
- `contexto/visao.md` e `contexto/arquitetura.md`: refletir o rumo nuvem (a decisão já está registrada, o texto acompanha a execução).
- `interno/mapa-sistema.json`: ao longo das fases, incluir os nós novos (core, hub, motor, postgres, cofre) e as ligações.

## O que o plano proíbe apagar

- Qualquer coisa dentro de `app/dados/`, `ojessegomes/`, `estudio-aura/`, `vkos/`, `vkos2/`.
- Histórico de `decisoes/` e `analises/`.
- Os testes existentes: eles migram junto com o código nas fases 0 a 3.
