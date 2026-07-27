// Ponte de tipos do CRM entre o web e o servidor.
//
// POR QUE ISTO EXISTE: o web declarava a propria copia das entidades do CRM.
// Quando o servidor foi pra v4, o typecheck do web continuou verde e a tela
// quebrou em runtime, porque o compilador nao tinha como ver a divergencia.
//
// Aqui o web importa direto o modelo do servidor, entao existe UMA definicao
// so. Mudou o servidor, o "npm run checar -w web" quebra na hora.
//
// A importacao e SO DE TIPO, e por isso e segura em tres frentes:
// - o esbuild do Vite apaga "export type" inteiro, entao nenhum arquivo do
//   servidor entra no bundle do navegador;
// - modelo.ts nao importa nada, entao o programa do web nao herda a arvore de
//   dependencias do Node;
// - os workspaces continuam com tsconfig separado, sem project reference nem
//   build compartilhado.
//
// Consequencia intencional: este arquivo e o unico ponto do web que atravessa
// a fronteira. Qualquer outro import do servidor no web e erro de arquitetura.

import type { EstadoCrm as EstadoCrmDoServidor } from "../../../server/src/crm/modelo";

// Trava de versao, so no nivel de tipo (nao emite nada em runtime). O web foi
// escrito contra a v4. Se o servidor subir pra v5, esta linha para de compilar
// e alguem e obrigado a olhar a tela antes de o usuario descobrir sozinho.
type Confere<Esperado, Real extends Esperado> = Real;
export type VersaoCrmDoWeb = Confere<4, EstadoCrmDoServidor["versao"]>;

export type {
  Coluna,
  Contato,
  DadosLead,
  EstadoCrm,
  Interacao,
  Negocio,
  Orcamento,
  Organizacao,
  ParticipanteNegocio,
  RegistroEstagio,
  StatusNegocio,
  StatusOrcamento,
  Tarefa,
  TipoColuna,
  TipoInteracao,
} from "../../../server/src/crm/modelo";
