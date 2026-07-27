// Ponte de tipos do CORE entre o web e o servidor.
//
// Mesma regra do CRM e das mensagens: o resumo do CORE tem UMA definicao so, no
// servidor. Se o web tivesse a propria copia, o servidor mudaria um campo e o
// typecheck do web continuaria verde com a tela quebrada, que foi exatamente o
// que aconteceu na subida do CRM pra v4.
//
// A importacao e SO DE TIPO: o esbuild do Vite apaga "export type" inteiro, e
// core/modelo.ts nao importa nada, entao nenhum arquivo de servidor entra no
// bundle do navegador.

import type { ResumoCore as ResumoCoreDoServidor } from "../../../server/src/core/modelo";

// Trava de versao, so no nivel de tipo. O web foi escrito contra a v1 do
// contrato. Se o servidor subir, esta linha para de compilar e alguem e
// obrigado a olhar a tela antes de o dono descobrir sozinho.
type Confere<Esperado, Real extends Esperado> = Real;
export type VersaoResumoCoreDoWeb = Confere<number, ResumoCoreDoServidor["versao"]>;

export type {
  DiaDeGasto,
  EstadoAtividade,
  GastoDoCore,
  ResumoCore,
  WorkspaceNoCore,
} from "../../../server/src/core/modelo";
