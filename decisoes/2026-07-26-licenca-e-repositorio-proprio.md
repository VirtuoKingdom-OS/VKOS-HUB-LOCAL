# Licença Business Source e repositório próprio

## Contexto

O VKOS Hub vinha sendo desenvolvido como pasta de trabalho, sem licença própria e sem estrutura de projeto. O Jesse pediu um repositório novo, privado, organizado como se fosse um projeto open source de mercado, com uma licença que impeça cópia sem crédito.

Existia também uma linha de trabalho de nuvem, o VKOS 3, que tentou subir o produto numa VPS do Google Cloud e não avançou.

## Decisão

Repositório privado novo, `OJESSEGOMES-VKOS/VKOS-HUB-LOCAL`, versionado a partir de 1.0.0.

**Licença: Business Source License 1.1**, com estes parâmetros:

- Additional Use Grant: nenhum. Nenhum uso em produção sem licença comercial escrita.
- Change Date: quatro anos após a publicação de cada versão.
- Change License: AGPL-3.0-or-later.
- Atribuição obrigatória e não removível, detalhada no arquivo `NOTICE`.

**Histórico:** a linha local-first virou `main`. A tentativa de nuvem foi preservada no branch `arquivo/vkos-3-nuvem`, sem ser apagada.

## Por quê

A BUSL é o padrão de quem constrói produto de software com ambição comercial e quer o código organizado sem entregá-lo à concorrência. É a licença de MariaDB, HashiCorp, Sentry e CockroachDB. Ela permite ler, estudar e modificar, proíbe uso em produção por terceiros, e converte sozinha para software livre depois de quatro anos, o que evita que o código morra trancado.

MIT e Apache dariam a estrutura pedida mas permitiriam que qualquer um pegasse o produto e vendesse. AGPL protegeria contra fork fechado, mas ainda deixaria um concorrente operar um serviço igual. A BUSL fecha exatamente essa porta.

A atribuição em `NOTICE` é a assinatura pedida: qualquer cópia ou derivado carrega o crédito de forma visível, e remover o crédito encerra os direitos.

O branch de arquivo existe porque a tentativa de nuvem custou trabalho real, e parte dela, o CORE de gestão e o broker de IA, pode ser útil quando o produto amadurecer. Apagar seria jogar fora sem necessidade.
