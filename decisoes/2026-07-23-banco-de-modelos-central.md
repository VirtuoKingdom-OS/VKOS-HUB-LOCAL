# Banco central de modelos de carrossel, com os originais dentro

## Contexto

Os modelos de carrossel eram arquivos copiados da semente `vkos2` no nascimento de cada
workspace. Modelo novo ou alterado só chegava a cliente criado depois. O Jesse queria um
banco no CORE pra criar modelos que aparecem em todos os clientes, e também ver e
atualizar os 14 originais por lá.

## Decisão

Banco central no filesystem do servidor (`app/dados/modelos-carrossel/`), fora dos
workspaces. Modelo novo nasce com id `b-*` e tem tipo (capa, desenvolvimento, CTA,
completo) que filtra o grupo do wizard. A lista que o cliente vê é a união do banco com
os modelos locais. Na hora de gerar, o servidor grava no workspace o arquivo exato de
cada modelo usado quando ele falta ou difere do banco (atualização no uso). Os originais
entram por sobrescrita copy-on-write: editar um original cria uma entrada com o MESMO id
e o banco passa a mandar naquele modelo; a semente nunca é alterada. Restaurar não apaga
a entrada: regrava o conteúdo de fábrica por cima, e o parque converge de volta no uso.
Original não pode ser excluído do banco. A criação tem dois caminhos: colar HTML pronto
ou gerar por IA a partir de uma imagem de referência, com refino no Studio antes de
salvar; qualquer modelo também abre no Studio pra edição.

## Por quê

Cópia no uso preserva o contrato de geração: a IA continua lendo um arquivo local e o
prompt não muda de natureza; comparar conteúdo em vez de copiar só quando falta é o que
faz a atualização de um original chegar a cliente antigo sem varredura em massa. O
prefixo `b-*` garante por construção que modelo novo nunca colide com a semente, e o id
idêntico na sobrescrita é o que deixa o banco mandar nos originais sem migração.
Restaurar mantendo a entrada em vez de apagar evita o buraco de cliente preso na versão
editada pra sempre: com a entrada igual à fábrica, a comparação do uso regrava o arquivo
de fábrica em cada workspace. Peças já geradas nunca mudam, porque peça é cópia
independente em `conteudo/`.
