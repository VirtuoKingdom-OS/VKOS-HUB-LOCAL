# A barra do CORE em três grupos, e a IDE sobe pro nível do dono

## Contexto

Depois que a porta pro workspace saiu do pé da barra, o CORE ficou com uma pilha
de cinco itens iguais: Dashboard, Workspaces, CRM, Conexões e Mapa. O Jesse
pediu mais duas telas, Clientes e Finanças, e sete itens numa lista chapada não
dizem mais o que é o quê. Item de olhar o negócio, item de tocar em cliente e
item de mexer na máquina do Hub ficavam com o mesmo peso e na mesma sequência.

A VKOS-IDE tinha outro problema. Ela morava no pé da barra do workspace, como se
fosse um item de projeto, mas ela nunca foi: é a bancada do dono, que abre por
cima de qualquer tela. Estar no nível de baixo obrigava a entrar num projeto pra
alcançar uma ferramenta que não é do projeto.

## Decisão

**A barra do CORE passa a ter três grupos, separados pelo mesmo fio sutil que já
marcava o rótulo de nível:**

| grupo | itens | o que reúne |
| --- | --- | --- |
| Core | Dashboard, Clientes, Workspaces | onde se olha o negócio |
| Gestão | CRM, Finanças | onde se toca em cliente e em dinheiro |
| Sistema | Conexões, Mapa | a máquina do Hub |

O separador é o `.sidebar-secao-nivel`, que já existia e já nasceu discreto de
propósito. Nenhum grupo ganha peso visual sobre outro, e nenhum token novo
entrou pra isso.

**A VKOS-IDE sai do nível do workspace e passa a viver só no pé da barra do
CORE**, ancorada no fim da navegação, acima do rodapé de status. O que ela edita
continua sendo a pasta do workspace ativo: mudou o lugar do botão, não o escopo
da ferramenta.

**Clientes e Finanças nascem com a porta aberta e sem conteúdo definido.** Os
dois itens são navegáveis e as duas telas dizem, na cara, que ainda não têm
conteúdo. Elas compartilham o componente `TelaEmDefinicao`.

## Por quê

O agrupamento veio antes do conteúdo porque a ordem da barra era a decisão que o
Jesse queria travar agora. Definir o que entra em Clientes e em Finanças é outra
conversa, e ela não precisa bloquear o desenho da navegação.

A tela vazia diz que está vazia em vez de mostrar tabela de mentira. Tela que
promete dado que não existe ensina a pessoa a desconfiar do resto do Hub, e o
Hub inteiro depende de o número na tela ser verdade: é o mesmo princípio que faz
o gasto com IA aparecer como piso quando falta preço, em vez de fingir exatidão.

Um efeito colateral que vale registrar: entrar num projeto agora depende da tela
Workspaces, e a barra do workspace perdeu o único item que não era do projeto.
Os dois níveis ficaram mais fiéis ao que cada um promete.
