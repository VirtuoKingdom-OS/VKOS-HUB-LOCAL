# O tema Escuro em cinza neutro, com o canvas em #0a0a0a

## Contexto

O Escuro nasceu como tradução do Claro para a noite, e herdou dele um tingimento:
o canvas era `#101318` e as superfícies `#171b21`, `#1e232b`, `#262d37`. Todos
azul-cinza, com o azul crescendo junto com a luminosidade.

O Jesse pediu o canvas em `rgb(10, 10, 10)`, cinza puro e mais fundo.

## Decisão

O canvas vai para `#0a0a0a` e **a escada inteira vai junto**, reneutralizada.

| token | antes | agora |
| --- | --- | --- |
| `--fundo` | #101318 | #0a0a0a |
| `--superficie` | #171b21 | #141414 |
| `--superficie-alta` | #1e232b | #1e1e1e |
| `--superficie-flutuante` | #262d37 | #2a2a2a |
| `--linha` | #2b323c | #2b2b2b |
| `--linha-forte` | #59677c | #6e6e6e |
| `--texto` | #f0f3f7 | #f5f5f5 |
| `--texto-suave` | #b3bcc9 | #b5b5b5 |
| `--texto-fraco` | #8a94a3 | #949494 |

Os `-rgb`, os tênues e o gradiente do Cérebro acompanharam. O `--scrim-rgb`
virou preto puro, `0, 0, 0`.

O menta não mudou: ele é a marca, e é a única voz colorida do sistema. Num
ambiente agora completamente neutro ele fala ainda mais alto, que é exatamente o
trabalho dele.

Os pares críticos foram refeitos e passam. O mais apertado é a `--linha-forte`
contra o cartão, em 3,61:1, acima dos 3:1 que o critério 1.4.11 exige de contorno
de controle. O texto sobre canvas ficou em 18,16:1.

## Por quê

Trocar só o `--fundo` era a mudança menor e teria sido a errada. Canvas cinza
puro com cartão azulado não lê como decisão, lê como sujeira: a diferença de
temperatura aparece na junção das duas superfícies, que é justamente a borda que
a escada de superfície usa para criar profundidade. O degrau continuaria lá, mas
contaminado.

O caminho é o do Vercel: preto quase puro, cinzas neutros, uma cor de marca só.
O Claro continua sendo a identidade, tingido de menta como sempre foi. Os dois
temas ficaram menos parecidos entre si em temperatura, e mais parecidos naquilo
que importa, que é a gramática: mesma escada de quatro degraus, mesmo fio de
linha, mesmo menta falando pouco.
