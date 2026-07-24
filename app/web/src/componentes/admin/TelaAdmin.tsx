import { useEffect, useMemo, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import {
  alterarFeatureAdmin,
  alterarWorkspaceAdmin,
  confirmarTotp,
  criarConviteAdmin,
  criarModeloAdmin,
  criarWorkspaceAdmin,
  definirCredencialAdmin,
  derrubarSessoesAdmin,
  desativarTotp,
  iniciarTotp,
  listarFeaturesAdmin,
  listarConvitesAdmin,
  listarMembrosAdmin,
  listarModelosAdmin,
  listarWorkspacesAdmin,
  obterClaudeCoreAdmin,
  obterEstadoMotoresAdmin,
  obterSessaoWeb,
  removerMembroAdmin,
  revogarConviteAdmin,
  testarClaudeCoreAdmin,
  testarMotorAdmin,
  type ConviteWorkspaceAdmin,
  type EstadoClaudeCore,
  type EstadoMotoresAdmin,
  type FeaturePlataforma,
  type MembroWorkspaceAdmin,
  type ModeloWorkspace,
  type WorkspacePlataforma,
} from "../../api/cliente";
import {
  Abas,
  AreaTexto,
  Aviso,
  Botao,
  Campo,
  EstadoVazio,
  EstadoCarregando,
  EstadoErro,
  Interruptor,
  Selecao,
} from "../comum/Sistema";
import { trocarAbaLimpando } from "./estadoAdmin";
import { MOTORES_ADMIN, nomeMotorAdmin } from "./motoresAdmin";
import { LogoWorkspace } from "./LogoWorkspace";
import { imagemParaDataUrl } from "../../util/imagem";
import "../../estilos/admin.css";

type Aba = "modelos" | "clientes" | "meu-claude" | "seguranca";
type AbaCliente = "features" | "acesso" | "consumo";

export function TelaAdmin() {
  const [aba, setAba] = useState<Aba>("clientes");
  const [features, setFeatures] = useState<FeaturePlataforma[]>([]);
  const [modelos, setModelos] = useState<ModeloWorkspace[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspacePlataforma[]>([]);
  const [motores, setMotores] = useState<EstadoMotoresAdmin | null>(null);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  async function recarregar() {
    try {
      const [catalogo, receitas, clientes, estadoMotores] = await Promise.all([
        listarFeaturesAdmin(),
        listarModelosAdmin(),
        listarWorkspacesAdmin(),
        obterEstadoMotoresAdmin().catch(() => null),
      ]);
      setFeatures(catalogo.features.filter((feature) => feature.disponivelParaCliente));
      setModelos(receitas.modelos);
      setWorkspaces(clientes.workspaces);
      setMotores(estadoMotores);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha ao abrir a Administração.");
    }
  }

  useEffect(() => { void recarregar(); }, []);

  async function executar(acao: () => Promise<unknown>, mensagem: string) {
    setErro("");
    setAviso("");
    try {
      await acao();
      setAviso(mensagem);
      await recarregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "A operação falhou.");
    }
  }

  return (
    <section className="tela-fluxo">
      <main className="admin-tela">
        <header className="admin-cabeca">
          <div>
            <span>VKOS HUB CORE</span>
            <h1>Central de operação</h1>
            <p>Clientes, modelos e segurança em uma visão compacta.</p>
          </div>
          <div className="admin-contadores" aria-label="Resumo da plataforma">
            <strong>{workspaces.length}</strong><span>clientes</span>
            <strong>{modelos.length}</strong><span>modelos</span>
          </div>
        </header>

        <Abas
          className="admin-abas"
          rotulo="Áreas da Administração"
          ativa={aba}
          aoMudar={(proxima) =>
            trocarAbaLimpando(proxima, setAba, setErro, setAviso)
          }
          itens={[
            { id: "clientes", nome: "Clientes" },
            { id: "modelos", nome: "Modelos" },
            { id: "meu-claude", nome: "Meu Claude" },
            { id: "seguranca", nome: "Segurança" },
          ]}
        />
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        {aviso && <Aviso tipo="sucesso">{aviso}</Aviso>}

        {aba === "clientes" && (
          <PainelClientes
            modelos={modelos}
            workspaces={workspaces}
            features={features}
            aoExecutar={executar}
            aoAvisar={setAviso}
            aoLimparMensagens={() => {
              setErro("");
              setAviso("");
            }}
            motores={motores}
          />
        )}
        {aba === "modelos" && (
          <PainelModelos features={features} modelos={modelos} aoExecutar={executar} />
        )}
        {aba === "meu-claude" && (
          <PainelMeuClaude aoErro={setErro} aoAvisar={setAviso} />
        )}
        {aba === "seguranca" && <PainelSeguranca aoErro={setErro} aoAvisar={setAviso} />}
      </main>
    </section>
  );
}

export function PainelModelos({
  features,
  modelos,
  aoExecutar,
}: {
  features: FeaturePlataforma[];
  modelos: ModeloWorkspace[];
  aoExecutar: (acao: () => Promise<unknown>, mensagem: string) => Promise<void>;
}) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [motor, setMotor] = useState("gemini");
  const [ativas, setAtivas] = useState<Set<string>>(new Set());

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    await aoExecutar(
      () => criarModeloAdmin({ nome, descricao, motorPadrao: motor, features: [...ativas], semente: "vkos2" }),
      "Plano criado. Ele já pode originar um workspace.",
    );
    setNome("");
    setDescricao("");
  }

  return (
    <section className="admin-grade">
      <form className="admin-form" onSubmit={enviar}>
        <div className="admin-titulo"><h2>Novo plano</h2><p>Defina a receita inicial de um workspace.</p></div>
        <Campo rotulo="Nome" value={nome} onChange={(evento) => setNome(evento.target.value)} required />
        <AreaTexto rotulo="Descrição" value={descricao} onChange={(evento) => setDescricao(evento.target.value)} />
        <Selecao
          rotulo="Motor padrão"
          ajuda={motor === "claude_team" ? "O workspace nasce no Gemini. Claude Team é liberado depois do teste da credencial." : undefined}
          value={motor}
          onChange={(evento) => setMotor(evento.target.value)}
        >
          {MOTORES_ADMIN.map((item) => (
            <option key={item.id} value={item.id}>{item.nome}</option>
          ))}
        </Selecao>
        <div className="admin-features" aria-label="Features iniciais">
          {features.map((feature) => (
            <Interruptor
              key={feature.id}
              ativo={ativas.has(feature.id)}
              rotulo={feature.nome}
              descricao={feature.descricao}
              aoMudar={(ativa) => setAtivas((anteriores) => {
                const proximas = new Set(anteriores);
                ativa ? proximas.add(feature.id) : proximas.delete(feature.id);
                return proximas;
              })}
            />
          ))}
        </div>
        <Botao variante="primario">Criar plano</Botao>
      </form>

      <div className="admin-lista">
        <div className="admin-titulo"><h2>Planos prontos</h2></div>
        {modelos.length === 0 && <EstadoVazio titulo="Nenhum plano ainda" mensagem="Crie a primeira receita pra provisionar workspaces." />}
        {modelos.map((modelo) => (
          <article className="admin-linha" key={modelo.id}>
            <div><strong>{modelo.nome}</strong><p>{modelo.descricao || "Sem descrição"}</p></div>
            <span>{nomeMotorAdmin(modelo.motor_padrao)}</span>
            <small>{modelo.features_json.length} features</small>
          </article>
        ))}
      </div>
    </section>
  );
}

export function PainelClientes({
  modelos,
  workspaces,
  features,
  motores,
  aoExecutar,
  aoAvisar,
  aoLimparMensagens,
  aoEntrarWorkspace,
  focoInicial = null,
}: {
  modelos: ModeloWorkspace[];
  workspaces: WorkspacePlataforma[];
  features: FeaturePlataforma[];
  motores: EstadoMotoresAdmin | null;
  aoExecutar: (acao: () => Promise<unknown>, mensagem: string) => Promise<void>;
  aoAvisar: (mensagem: string) => void;
  aoLimparMensagens: () => void;
  aoEntrarWorkspace?: (id: string) => void;
  focoInicial?: string | null;
}) {
  const [nome, setNome] = useState("");
  const [modeloId, setModeloId] = useState("");
  const [selecionadoId, setSelecionadoId] = useState<string | null>(focoInicial);
  const selecionado = useMemo(
    () => workspaces.find((workspace) => workspace.id === selecionadoId) ?? null,
    [workspaces, selecionadoId],
  );

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    await aoExecutar(
      () => criarWorkspaceAdmin({ nome, modeloId }),
      "Cliente provisionado sem liberar acesso externo.",
    );
    setNome("");
    setModeloId("");
  }

  return (
    <section className="admin-clientes">
      <form className="admin-form admin-form-cliente" onSubmit={enviar}>
        <div className="admin-titulo"><h2>Novo cliente</h2><p>O identificador interno é criado automaticamente.</p></div>
        <Campo rotulo="Nome do cliente" value={nome} onChange={(evento) => setNome(evento.target.value)} required />
        <Selecao rotulo="Modelo" value={modeloId} onChange={(evento) => setModeloId(evento.target.value)} required>
          <option value="">Escolha uma receita</option>
          {modelos.map((modelo) => <option value={modelo.id} key={modelo.id}>{modelo.nome}</option>)}
        </Selecao>
        <Botao variante="primario" disabled={modelos.length === 0}>Provisionar cliente</Botao>
      </form>

      <div className="admin-lista admin-lista-clientes">
        <div className="admin-titulo"><h2>Clientes</h2></div>
        {workspaces.length === 0 && <EstadoVazio titulo="Nenhum cliente ainda" mensagem="Provisione o primeiro workspace a partir de um modelo." />}
        {workspaces.map((workspace) => (
          <article className={`admin-linha admin-cliente${workspace.id === selecionadoId ? " selecionado" : ""}`} key={workspace.id}>
            <div><strong>{workspace.nome}</strong><p>${Number(workspace.consumo_mes).toFixed(2)} neste mês</p></div>
            <span className={`admin-selo ${workspace.status}`}>{workspace.status}</span>
            <span>{nomeMotorAdmin(workspace.motor)}</span>
            <div className="admin-cliente-acoes">
              {aoEntrarWorkspace && (
                <Botao variante="sutil" type="button" onClick={() => aoEntrarWorkspace(workspace.id)}>
                  Entrar
                </Botao>
              )}
              <Botao variante="sutil" type="button" onClick={() => setSelecionadoId(workspace.id)}>Gerenciar</Botao>
            </div>
          </article>
        ))}
      </div>

      {selecionado && (
        <DetalheCliente
          workspace={selecionado}
          features={features}
          motores={motores}
          aoExecutar={aoExecutar}
          aoAvisar={aoAvisar}
          aoLimparMensagens={aoLimparMensagens}
          aoFechar={() => setSelecionadoId(null)}
          aoEntrarWorkspace={aoEntrarWorkspace}
        />
      )}
    </section>
  );
}

export function DetalheCliente({
  workspace,
  features,
  motores,
  aoExecutar,
  aoAvisar,
  aoLimparMensagens,
  aoFechar,
  aoEntrarWorkspace,
}: {
  workspace: WorkspacePlataforma;
  features: FeaturePlataforma[];
  motores: EstadoMotoresAdmin | null;
  aoExecutar: (acao: () => Promise<unknown>, mensagem: string) => Promise<void>;
  aoAvisar: (mensagem: string) => void;
  aoLimparMensagens: () => void;
  aoFechar: () => void;
  aoEntrarWorkspace?: (id: string) => void;
}) {
  const [aba, setAba] = useState<AbaCliente>("features");
  const [email, setEmail] = useState("");
  const [tokenApify, setTokenApify] = useState("");
  const [tokenClaude, setTokenClaude] = useState("");
  const [consentimentoClaude, setConsentimentoClaude] = useState(false);
  const [orcamento, setOrcamento] = useState(String(workspace.orcamento_mensal));
  const [acaoOrcamento, setAcaoOrcamento] = useState<"avisar" | "cortar">(workspace.acao_ao_estourar);
  const [convites, setConvites] = useState<ConviteWorkspaceAdmin[] | null>(null);
  const [membros, setMembros] = useState<MembroWorkspaceAdmin[] | null>(null);
  const [erroConvites, setErroConvites] = useState("");
  const [erroMembros, setErroMembros] = useState("");

  useEffect(() => {
    setOrcamento(String(workspace.orcamento_mensal));
    setAcaoOrcamento(workspace.acao_ao_estourar);
  }, [workspace.id, workspace.orcamento_mensal, workspace.acao_ao_estourar]);

  async function carregarConvites() {
    setErroConvites("");
    try {
      setConvites((await listarConvitesAdmin(workspace.id)).convites);
    } catch (falha) {
      setConvites([]);
      setErroConvites(
        falha instanceof Error ? falha.message : "Não foi possível carregar os convites.",
      );
    }
  }

  async function carregarMembros() {
    setErroMembros("");
    try {
      setMembros((await listarMembrosAdmin(workspace.id)).membros);
    } catch (falha) {
      setMembros([]);
      setErroMembros(
        falha instanceof Error ? falha.message : "Não foi possível carregar os membros.",
      );
    }
  }

  useEffect(() => {
    if (aba !== "acesso") return;
    void carregarConvites();
    void carregarMembros();
  }, [aba, workspace.id]);

  async function convidar(evento: FormEvent) {
    evento.preventDefault();
    let link = "";
    await aoExecutar(async () => {
      const resposta = await criarConviteAdmin(workspace.id, email);
      link = resposta.convite.url;
    }, "Convite criado por 72 horas.");
    if (link) {
      setEmail("");
      aoAvisar(`Convite pronto: ${link}`);
      await carregarConvites();
    }
  }

  return (
    <aside className="admin-detalhe" aria-label={`Gerenciar ${workspace.nome}`}>
      <header>
        <div><span>Workspace selecionado</span><h2>{workspace.nome}</h2></div>
        <div className="admin-detalhe-acoes">
          {aoEntrarWorkspace && (
            <Botao variante="primario" type="button" onClick={() => aoEntrarWorkspace(workspace.id)}>
              Entrar no workspace
            </Botao>
          )}
          <Botao variante="sutil" type="button" onClick={aoFechar}>Fechar</Botao>
        </div>
      </header>
      <div className="admin-identidade">
        <LogoWorkspace nome={workspace.nome} logo={workspace.logo} className="ws-logo-g" />
        <div className="admin-identidade-acoes">
          <span className="admin-identidade-ajuda">A logo aparece na lista de workspaces.</span>
          <div className="admin-identidade-botoes">
            <label className="comum-botao comum-botao-sutil admin-logo-escolher">
              {workspace.logo ? "Trocar logo" : "Adicionar logo"}
              <input
                type="file"
                accept="image/*"
                onChange={(evento) => {
                  const arquivo = evento.target.files?.[0];
                  evento.target.value = "";
                  if (!arquivo) return;
                  void aoExecutar(async () => {
                    const logo = await imagemParaDataUrl(arquivo, 256);
                    return alterarWorkspaceAdmin(workspace.id, { logo });
                  }, "Logo atualizada.");
                }}
              />
            </label>
            {workspace.logo && (
              <Botao
                variante="sutil"
                type="button"
                onClick={() => void aoExecutar(
                  () => alterarWorkspaceAdmin(workspace.id, { logo: null }),
                  "Logo removida.",
                )}
              >
                Remover
              </Botao>
            )}
          </div>
        </div>
      </div>
      <Abas
        ativa={aba}
        aoMudar={(proxima) => {
          aoLimparMensagens();
          setAba(proxima);
        }}
        rotulo="Detalhes do cliente"
        itens={[
          { id: "features", nome: "Features" },
          { id: "acesso", nome: "Acesso" },
          { id: "consumo", nome: "Consumo" },
        ]}
      />

      {aba === "features" && (
        <div className="admin-features admin-features-detalhe">
          {features.map((feature) => (
            <Interruptor
              key={feature.id}
              ativo={workspace.features_ativas.includes(feature.id)}
              rotulo={feature.nome}
              descricao={feature.descricao}
              aoMudar={(ativa) => void aoExecutar(
                () => alterarFeatureAdmin(workspace.id, feature.id, ativa),
                "Feature atualizada imediatamente.",
              )}
            />
          ))}
        </div>
      )}

      {aba === "acesso" && (
        <div className="admin-acesso-grade">
          <section className="admin-bloco">
            <h3>Operação</h3>
            <Selecao
              rotulo="Motor de IA"
              ajuda={MOTORES_ADMIN.find((item) => item.id === workspace.motor)?.descricao}
              value={workspace.motor === "nenhum" ? "" : workspace.motor}
              onChange={(evento) => void aoExecutar(
                () => alterarWorkspaceAdmin(workspace.id, { motor: evento.target.value }),
                "Motor alterado para as próximas sessões.",
              )}
            >
              {workspace.motor === "nenhum" && (
                <option value="" disabled>IA em manutenção, escolha um motor</option>
              )}
              {MOTORES_ADMIN.map((item) => {
                const claudeSemTeste = item.id === "claude_team" && workspace.claude_credencial_status !== "valida";
                return (
                  <option key={item.id} value={item.id} disabled={claudeSemTeste}>
                    {item.nome}{claudeSemTeste ? " (teste a credencial)" : ""}
                  </option>
                );
              })}
            </Selecao>
            <div className={`admin-estado-motor ${workspace.motor_estado}`}>
              <strong>
                {workspace.motor_estado === "operante"
                  ? "Motor operante"
                  : workspace.motor_estado === "manutencao"
                    ? "Motor em manutenção"
                    : "Motor ainda não testado"}
              </strong>
              {workspace.motor_testado_em && <small>Último teste: {new Date(workspace.motor_testado_em).toLocaleString("pt-BR")}</small>}
            </div>
            {motores?.gemini.disponivel && (
              <Botao
                variante="sutil"
                type="button"
                onClick={() => void aoExecutar(
                  () => testarMotorAdmin(workspace.id, "gemini"),
                  "Gemini respondeu e o consumo do teste foi registrado.",
                )}
              >
                Testar Gemini
              </Botao>
            )}
            <Interruptor
              ativo={workspace.status === "ativo"}
              rotulo="Workspace ativo"
              descricao="Suspender derruba as sessões web deste cliente."
              aoMudar={(ativo) => void aoExecutar(
                () => alterarWorkspaceAdmin(workspace.id, { status: ativo ? "ativo" : "suspenso" }),
                "Status do cliente atualizado.",
              )}
            />
          </section>

          <form className="admin-bloco" onSubmit={convidar}>
            <h3>Liberar login</h3>
            <Campo rotulo="Email do cliente" type="email" value={email} onChange={(evento) => setEmail(evento.target.value)} required />
            <Botao variante="primario">Gerar convite</Botao>
          </form>

          <section className="admin-bloco admin-bloco-lista">
            <h3>Convites</h3>
            {convites === null && <EstadoCarregando linhas={3} />}
            {erroConvites && (
              <EstadoErro
                titulo="Convites indisponíveis"
                mensagem={erroConvites}
                aoTentar={() => void carregarConvites()}
              />
            )}
            {!erroConvites && convites?.length === 0 && (
              <EstadoVazio
                titulo="Nenhum convite"
                mensagem="Os próximos convites aparecerão aqui."
              />
            )}
            {!erroConvites && convites?.map((convite) => (
              <div className="admin-acesso-item" key={convite.id}>
                <div>
                  <strong>{convite.email}</strong>
                  <small>
                    {convite.estado === "pendente"
                      ? `Expira em ${new Date(convite.expira_em).toLocaleString("pt-BR")}`
                      : convite.estado === "usado"
                        ? "Convite usado"
                        : "Convite expirado"}
                  </small>
                </div>
                {convite.estado === "pendente" && (
                  <Botao
                    variante="sutil"
                    type="button"
                    onClick={() => {
                      if (!window.confirm(`Revogar o convite de ${convite.email}?`)) return;
                      void aoExecutar(
                        () => revogarConviteAdmin(workspace.id, convite.id),
                        "Convite revogado.",
                      ).then(() => carregarConvites());
                    }}
                  >
                    Revogar
                  </Botao>
                )}
              </div>
            ))}
          </section>

          <section className="admin-bloco admin-bloco-lista">
            <div className="admin-bloco-cabeca">
              <h3>Membros com login</h3>
              <Botao
                variante="sutil"
                type="button"
                onClick={() => void aoExecutar(
                  () => derrubarSessoesAdmin(workspace.id),
                  "Sessões do cliente encerradas.",
                ).then(() => carregarMembros())}
              >
                Encerrar sessões
              </Botao>
            </div>
            {membros === null && <EstadoCarregando linhas={3} />}
            {erroMembros && (
              <EstadoErro
                titulo="Membros indisponíveis"
                mensagem={erroMembros}
                aoTentar={() => void carregarMembros()}
              />
            )}
            {!erroMembros && membros?.length === 0 && (
              <EstadoVazio
                titulo="Nenhum login liberado"
                mensagem="O cliente aparecerá aqui depois de aceitar o convite."
              />
            )}
            {!erroMembros && membros?.map((membro) => (
              <div className="admin-acesso-item" key={membro.usuario_id}>
                <div>
                  <strong>{membro.email}</strong>
                  <small>
                    {membro.ultimo_acesso
                      ? `Último acesso: ${new Date(membro.ultimo_acesso).toLocaleString("pt-BR")}`
                      : "Ainda não acessou"}
                  </small>
                </div>
                <Botao
                  variante="perigo"
                  type="button"
                  onClick={() => {
                    if (!window.confirm(`Remover o acesso de ${membro.email}?`)) return;
                    void aoExecutar(
                      () => removerMembroAdmin(workspace.id, membro.usuario_id),
                      "Acesso do membro removido.",
                    ).then(() => carregarMembros());
                  }}
                >
                  Remover
                </Botao>
              </div>
            ))}
          </section>

          <form className="admin-bloco" onSubmit={(evento) => {
            evento.preventDefault();
            void aoExecutar(
              () => definirCredencialAdmin(workspace.id, "apify", tokenApify),
              "Credencial Apify guardada no cofre.",
            ).then(() => setTokenApify(""));
          }}>
            <h3>Busca de leads</h3>
            <Campo rotulo="Token Apify" type="password" ajuda="A chave fica no cofre e nunca aparece no hub do cliente." value={tokenApify} onChange={(evento) => setTokenApify(evento.target.value)} minLength={12} required />
            <Botao variante="neutro">Guardar no cofre</Botao>
          </form>

          <form className="admin-bloco" onSubmit={(evento) => {
            evento.preventDefault();
            void aoExecutar(
              () => definirCredencialAdmin(workspace.id, "claude_team", tokenClaude, consentimentoClaude),
              "Credencial Claude guardada. Faça o teste antes de selecionar o motor.",
            ).then(() => {
              setTokenClaude("");
              setConsentimentoClaude(false);
            });
          }}>
            <h3>Claude Team do cliente</h3>
            <Campo
              rotulo="Credencial Claude"
              type="password"
              ajuda="O segredo fica cifrado e isolado neste workspace."
              value={tokenClaude}
              onChange={(evento) => setTokenClaude(evento.target.value)}
              minLength={12}
              required
            />
            <Interruptor
              ativo={consentimentoClaude}
              rotulo="Tenho autorização do cliente"
              descricao="Confirmo que esta conta pode ser usada neste workspace."
              aoMudar={setConsentimentoClaude}
            />
            <Botao variante="neutro" disabled={!consentimentoClaude}>Guardar credencial</Botao>
            {workspace.claude_credencial_configurada && (
              <Botao
                variante="sutil"
                type="button"
                onClick={() => void aoExecutar(
                  () => testarMotorAdmin(workspace.id, "claude_team"),
                  "Claude Team respondeu. A credencial está liberada para seleção.",
                )}
              >
                Testar Claude Team
              </Botao>
            )}
            <small className={`admin-status-credencial ${workspace.claude_credencial_status}`}>
              Estado: {workspace.claude_credencial_status.replace("_", " ")}
            </small>
          </form>
        </div>
      )}

      {aba === "consumo" && (
        <div className="admin-consumo-grade">
          <div className="admin-consumo">
            <span>Consumo estimado no mês</span>
            <strong>${Number(workspace.consumo_mes).toFixed(2)}</strong>
            <p>O valor reúne as sessões contabilizadas deste workspace no mês atual.</p>
          </div>
          <form className="admin-bloco" onSubmit={(evento) => {
            evento.preventDefault();
            void aoExecutar(
              () => alterarWorkspaceAdmin(workspace.id, {
                orcamentoMensal: Number(orcamento),
                acaoAoEstourar: acaoOrcamento,
              }),
              "Limite mensal atualizado.",
            );
          }}>
            <h3>Limite mensal</h3>
            <Campo
              rotulo="Orçamento em USD"
              type="number"
              min="0"
              step="0.01"
              value={orcamento}
              onChange={(evento) => setOrcamento(evento.target.value)}
              required
            />
            <Selecao
              rotulo="Ao atingir o limite"
              value={acaoOrcamento}
              onChange={(evento) => setAcaoOrcamento(evento.target.value as "avisar" | "cortar")}
            >
              <option value="avisar">Avisar e continuar</option>
              <option value="cortar">Interromper novas sessões</option>
            </Selecao>
            <Botao variante="primario">Salvar limite</Botao>
          </form>
        </div>
      )}
    </aside>
  );
}

export function PainelMeuClaude({ aoErro, aoAvisar }: { aoErro: (erro: string) => void; aoAvisar: (aviso: string) => void }) {
  const [estado, setEstado] = useState<EstadoClaudeCore | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [testando, setTestando] = useState(false);

  async function carregar(atualizar = false) {
    setCarregando(true);
    aoErro("");
    try {
      setEstado(await obterClaudeCoreAdmin(atualizar));
    } catch (falha) {
      aoErro(falha instanceof Error ? falha.message : "Não foi possível consultar o Claude do CORE.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { void carregar(); }, []);

  async function testar() {
    setTestando(true);
    aoErro("");
    try {
      await testarClaudeCoreAdmin();
      aoAvisar("O Claude do CORE respondeu ao teste.");
      await carregar(true);
    } catch (falha) {
      aoErro(falha instanceof Error ? falha.message : "O teste do Claude falhou.");
    } finally {
      setTestando(false);
    }
  }

  return (
    <section className="admin-meu-claude">
      <div className="admin-titulo">
        <h2>Meu Claude no CORE</h2>
        <p>Esta conta é exclusiva da sua operação. Ela não é compartilhada com workspaces de clientes.</p>
      </div>
      {carregando && !estado ? (
        <p>Consultando a instalação...</p>
      ) : estado && (
        <div className="admin-claude-grade">
          <section className="admin-bloco">
            <h3>Estado atual</h3>
            <dl className="admin-definicoes">
              <div><dt>CLI</dt><dd>{estado.instalado ? "instalado" : "não encontrado"}</dd></div>
              <div><dt>Versão</dt><dd>{estado.versao ?? "indisponível"}</dd></div>
              <div><dt>Login</dt><dd>{estado.logado === true ? "conectado" : estado.logado === false ? "não conectado" : "não confirmado"}</dd></div>
              <div><dt>Conta</dt><dd>{estado.conta ?? "não informada"}</dd></div>
            </dl>
            <div className="admin-acoes">
              <Botao type="button" variante="sutil" ocupado={carregando} onClick={() => void carregar(true)}>Atualizar estado</Botao>
              <Botao type="button" variante="primario" ocupado={testando} disabled={!estado.instalado} onClick={() => void testar()}>Testar Claude</Botao>
            </div>
          </section>
          <section className="admin-bloco admin-login-claude">
            <h3>Entrar pela VPS</h3>
            <p>Abra um terminal na pasta da implantação e execute:</p>
            <code>{estado.loginVps}</code>
            <p>Siga o link de autenticação mostrado pelo Claude. O volume <code>claude_core</code> preserva o login entre recriações do container.</p>
          </section>
        </div>
      )}
    </section>
  );
}

export function PainelSeguranca({ aoErro, aoAvisar }: { aoErro: (erro: string) => void; aoAvisar: (aviso: string) => void }) {
  const [ativo, setAtivo] = useState(false);
  const [segredo, setSegredo] = useState<{ segredoTotp: string; uriTotp: string } | null>(null);
  const [codigo, setCodigo] = useState("");
  const [qr, setQr] = useState("");

  useEffect(() => {
    obterSessaoWeb().then((sessao) => setAtivo(sessao.totpAtivo === true)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!segredo) { setQr(""); return; }
    QRCode.toDataURL(segredo.uriTotp, { margin: 1, width: 220 }).then(setQr).catch(() => setQr(""));
  }, [segredo]);

  async function comErro(acao: () => Promise<void>) {
    aoErro("");
    try { await acao(); } catch (falha) { aoErro(falha instanceof Error ? falha.message : "A operação falhou."); }
  }

  return (
    <section className="admin-seguranca">
      <div className="admin-titulo"><h2>Segurança do CORE</h2><p>A senha continua obrigatória em produção. O autenticador é uma proteção opcional.</p></div>
      <Interruptor
        ativo={ativo}
        rotulo="Verificação em duas etapas"
        descricao={ativo ? "O próximo login também pedirá o código de 6 dígitos." : "Ligue quando quiser proteger o CORE com um aplicativo autenticador."}
        aoMudar={(ligar) => void comErro(async () => {
          if (ligar) {
            setSegredo(await iniciarTotp());
            return;
          }
          await desativarTotp();
          setAtivo(false);
          setSegredo(null);
          aoAvisar("Verificação em duas etapas desligada.");
        })}
      />
      {segredo && (
        <form className="admin-totp" onSubmit={(evento) => {
          evento.preventDefault();
          void comErro(async () => {
            await confirmarTotp(segredo.segredoTotp, codigo);
            setAtivo(true);
            setSegredo(null);
            setCodigo("");
            aoAvisar("Verificação em duas etapas ativada.");
          });
        }}>
          <div><h3>Escaneie no autenticador</h3><p>Depois, confirme com o código atual do aplicativo.</p></div>
          {qr && <img src={qr} alt="QR code para configurar o autenticador" width={220} height={220} />}
          <code>{segredo.segredoTotp}</code>
          <Campo rotulo="Código de 6 dígitos" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={codigo} onChange={(evento) => setCodigo(evento.target.value.replace(/\D/g, ""))} required />
          <Botao variante="primario">Confirmar e ativar</Botao>
        </form>
      )}
    </section>
  );
}
