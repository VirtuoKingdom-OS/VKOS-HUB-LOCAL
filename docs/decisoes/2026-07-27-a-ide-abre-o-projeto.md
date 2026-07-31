# A VKOS-IDE abre o projeto inteiro, não a pasta do workspace

## Contexto

O Jesse abriu a VKOS-IDE e disse que ela parecia desatualizada em relação ao que
o projeto é hoje, e que devia estar faltando pasta.

Estava. A árvore listava:

```
VKOS
  .claude/  cerebro/  conteudo/  identidade/  marca/  materiais/  templates/
  CLAUDE.md  COMECE-AQUI.md  README.md  package.json
```

Isso é a pasta VKOS de um cliente, o mecanismo do produto. Nada do projeto:
nem `app/`, nem `docs/`, nem `interno/`, nem `ferramentas/`.

A causa era uma linha: `/ide/arvore` usava `obterPastaVkos()`, a pasta do
workspace ativo. E o chat rodava com `cwd` na mesma pasta, então a IA também
respondia sobre ela.

Isso fazia sentido quando a IDE era um item do nível do workspace. Ela subiu pro
CORE nesta mesma data, e o escopo não subiu junto.

## Decisão

**A base da IDE passa a ser a raiz da instalação**, a pasta que contém o `app/`.
Em desenvolvimento é a raiz do repositório; instalada, é a pasta com `app/` ao
lado de `VKOS/`, que é o que o instalador monta.

O cálculo mora em `util/raizProjeto.ts`, com teste que exige encontrar
`app/server/` dentro. Se a contagem de níveis quebrar, o teste reprova em vez de
a IDE abrir a pasta errada em silêncio.

**O chat vai junto.** A criação de sessão aceita `escopo: "projeto"`, que troca a
pasta de trabalho pela raiz. Só o chat da IDE usa. A comparação é exata: qualquer
outro valor, inclusive ausente, cai na pasta do workspace.

**`app/dados` fica fora do alcance.** Some da árvore e recusa com 403 em leitura,
gravação, criação e exclusão, ignorando a caixa do caminho.

O teto de profundidade subiu de 8 para 14. Com a base um nível acima, o mais
fundo do projeto já batia 7.

## Por quê

A IDE é a bancada do dono, e bancada que só alcança uma subpasta não é bancada. O
pedido do Jesse foi direto: que ela funcione como abrir a pasta no VSCode com a
extensão do Claude Code ao lado.

O chat tinha que ir junto, e esse é o ponto que mais importa. Uma IDE que lista o
projeto e conversa com uma IA presa em outra pasta é pior do que não ter IDE: a
resposta parece certa, cita arquivo com confiança e fala de outro lugar. Erro que
se anuncia custa menos que erro que convence.

O ganho de graça: com o `cwd` na raiz, o Claude passa a ler o `CLAUDE.md` do
projeto sozinho, como faz em qualquer pasta. A IDE herdou o contrato do
repositório sem precisar injetar nada.

`app/dados` ficou fora porque ali moram o registro de workspaces, o CRM e o token
da conexão, e o chat da IDE pode rodar em "Poder total". Sumir da lista não
bastava: caminho escondido mas alcançável por URL é esconder, não proteger, então
a guarda está no resolvedor e vale para todas as operações. O Hub continua lendo
e gravando ali normalmente. Saiu da bancada, não do sistema.

## O que ficou de fora

O chat da IDE ainda exige um workspace ativo, porque a sessão precisa de
`workspaceId` para o registro e o rateio de custo. A árvore abre sem workspace,
o chat não. Na prática não aparece, porque o onboarding cria o workspace antes de
liberar o Hub, mas a assimetria existe.
