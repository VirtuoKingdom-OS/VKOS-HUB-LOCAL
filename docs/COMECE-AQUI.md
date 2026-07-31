# Comece aqui

Esta é a pasta de desenvolvimento do VKOS Hub. É autônoma: pode ser movida para qualquer lugar e aberta direto no Claude Code.

## Mapa dos arquivos

- `CLAUDE.md`: as regras de operação deste workspace. Leia primeiro.
- `docs/contexto/visao.md`: o que é o produto e para quem.
- `docs/contexto/arquitetura.md`: como o app é construído por dentro.
- `docs/contexto/roadmap.md`: as fases do desenvolvimento, em ordem.
- `docs/contexto/ecossistema.md`: o produto VKOS e o posicionamento da VK.
- `docs/decisoes/`: uma decisão de produto ou técnica por arquivo.
- `docs/planos/`: o plano de cada rodada grande, com estado e execução.
- `app/`: o código do app (server Fastify + web React), com o contrato técnico em `app/CONTRATO.md`.
- `ferramentas/`: scripts que conferem o Hub e não fazem parte do produto.
- `interno/`: dados curados que o app lê em execução (o mapa do sistema e o de telas). Fica fora do `docs/` de propósito: não é documentação, é dado.
- `vkos/`: cópia de referência do VKOS, o workspace que o Hub abre. Fora do versionamento.
- `vkos2/`: o template do workspace que vai pro cliente. Fora do versionamento e fora da leitura de contexto.
- `README.md`: a visão geral do repositório, estrutura e como rodar.
- `CHANGELOG.md`: o histórico de versões.

## Primeiro passo

Passe o olho no `CLAUDE.md` para pegar as regras da casa, depois no `README.md` para a estrutura e os comandos. Para saber onde o desenvolvimento está, abra `docs/contexto/roadmap.md`.
