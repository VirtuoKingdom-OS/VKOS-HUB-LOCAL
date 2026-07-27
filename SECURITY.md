# Segurança

## Modelo de ameaça

O VKOS Hub Local roda inteiro na máquina do usuário. Não existe backend hospedado, não existe telemetria, não existe conta remota. O servidor escuta em `127.0.0.1` e não é exposto à rede.

Isso muda o que importa. O risco principal não é invasão remota, é vazamento local: credencial gravada em claro, dado de cliente indo parar em peça publicada, ou segredo sobrevivendo à exclusão de um workspace.

## Garantias do produto

1. **Credencial de IA nunca passa pelo Hub.** O login acontece pelo programa oficial do motor escolhido. O Hub não recebe, não guarda e não transmite token de IA.
2. **Segredo de conexão fica em disco local**, dentro de `app/dados/`, fora do versionamento. Nunca sai da máquina.
3. **Excluir um workspace apaga os segredos dele.** Token é revogado quando o serviço permite, e a pasta de dados é removida.
4. **Telefone e email de cliente não entram no contexto da IA.** O que a IA recebe do CRM é agregado, e das conversas vai o primeiro nome do contato mais o texto já limpo: o telefone e o email conhecidos do contato são apagados, e depois qualquer email ou sequência de 8 a 15 dígitos que sobre no texto vira marcador. O resumo carrega uma proibição explícita de copiar dado de cliente para peça publicável, com teste afirmando o texto injetado. Vale saber o limite: essa proibição é instrução para um modelo, então reduz o risco e não elimina. A garantia técnica é a limpeza automática, que roda sempre. Ver `decisoes/2026-07-27-o-que-a-ia-recebe-do-crm.md`.
5. **Dado do usuário é sagrado.** Arquivo corrompido vai para quarentena com data, nunca é sobrescrito por estado vazio.

## O que não é protegido

- Quem tem acesso físico ou administrativo à máquina tem acesso aos dados. Use criptografia de disco do sistema operacional.
- `app/dados/` não é criptografado em repouso.
- O Hub confia no processo do motor de IA que ele mesmo dispara.

## Reportando uma vulnerabilidade

Repositório privado, time de uma pessoa. Reporte direto para jesseconta017@gmail.com.

Não abra issue pública para falha de segurança.

## Checklist antes de liberar uma versão

- Nenhum segredo commitado. Confira `app/dados/` fora do versionamento.
- Nenhum token em log, em mensagem de erro ou em resposta de rota.
- Nenhum dado pessoal em prompt que gera peça publicável.
- Exclusão de workspace limpa segredo e dado pessoal.
