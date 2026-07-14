import { usarEstado } from "../../estado/contexto";
import { INFO_STATUS } from "../../config/status";
import { Marca } from "../comum/Telas";

const LIMITE_SESSOES = 5;

export function BarraSuperior() {
  const { estadoVkos, ambiente, sessoes, wsConectado } = usarEstado();

  const ativas = sessoes.filter((s) => INFO_STATUS[s.status].ativa).length;
  const nomePasta = estadoVkos?.pasta
    ? estadoVkos.pasta.split(/[\\/]/).filter(Boolean).pop() ?? estadoVkos.pasta
    : "sem pasta";
  const claudeOk = ambiente?.claude.instalado ?? false;

  return (
    <header className="barra-superior">
      <Marca />
      <div className="separador" />

      <div className="info-item" title={estadoVkos?.pasta ?? ""}>
        <span className="rotulo">VKOS</span>
        <span className="pilula-pasta">{nomePasta}</span>
      </div>

      <div className="info-item">
        <span className="rotulo">Claude</span>
        <span className={`luz ${claudeOk ? "on" : "off"}`} />
        <span>{claudeOk ? "pronto" : "fora"}</span>
      </div>

      <div className="espacador" />

      <div className="info-item" title={wsConectado ? "Conectado ao vivo" : "Reconectando"}>
        <span className={`luz ${wsConectado ? "on" : "off"}`} />
        <span>{wsConectado ? "ao vivo" : "reconectando"}</span>
      </div>

      <div
        className="contador-sessoes"
        title="Sessoes ativas sobre o limite de 5 ao mesmo tempo"
      >
        {ativas} / {LIMITE_SESSOES}
      </div>
    </header>
  );
}
