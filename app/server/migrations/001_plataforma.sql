CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  hash_senha text NOT NULL,
  papel text NOT NULL CHECK (papel IN ('operador', 'cliente')),
  totp_secret text,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'bloqueado')),
  falhas_login integer NOT NULL DEFAULT 0,
  bloqueado_ate timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS modelos_workspace (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  features_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  motor_padrao text NOT NULL CHECK (motor_padrao IN ('claude_team', 'gemini', 'nenhum')),
  pasta_semente text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text NOT NULL UNIQUE,
  modelo_origem_id uuid REFERENCES modelos_workspace(id) ON DELETE SET NULL,
  motor text NOT NULL CHECK (motor IN ('claude_team', 'gemini', 'nenhum')),
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'suspenso')),
  pasta text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS membros_workspace (
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  papel text NOT NULL CHECK (papel IN ('dono', 'membro')),
  PRIMARY KEY (usuario_id, workspace_id)
);

CREATE TABLE IF NOT EXISTS features_workspace (
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  feature_id text NOT NULL,
  ativa boolean NOT NULL DEFAULT true,
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (workspace_id, feature_id)
);

CREATE TABLE IF NOT EXISTS credenciais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('claude_team', 'gemini', 'conexao_externa')),
  valor_cifrado text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, tipo)
);

CREATE TABLE IF NOT EXISTS convites (
  token_hash text PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  papel text NOT NULL DEFAULT 'membro' CHECK (papel IN ('dono', 'membro')),
  expira_em timestamptz NOT NULL,
  usado_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auditoria (
  id bigserial PRIMARY KEY,
  usuario_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,
  acao text NOT NULL,
  alvo text NOT NULL,
  detalhes_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS consumo_ia (
  id bigserial PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  sessao_id text NOT NULL,
  motor text NOT NULL,
  modelo text NOT NULL,
  tokens_entrada integer NOT NULL DEFAULT 0,
  tokens_saida integer NOT NULL DEFAULT 0,
  custo_estimado numeric(14, 6) NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS limites_workspace (
  workspace_id uuid PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  orcamento_mensal numeric(12, 2) NOT NULL DEFAULT 0,
  acao_ao_estourar text NOT NULL DEFAULT 'avisar' CHECK (acao_ao_estourar IN ('avisar', 'cortar'))
);

CREATE TABLE IF NOT EXISTS sessoes_web (
  token_hash text PRIMARY KEY,
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  modo text NOT NULL CHECK (modo IN ('core', 'hub')),
  expira_em timestamptz NOT NULL,
  ultimo_uso timestamptz NOT NULL DEFAULT now(),
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS redefinicoes_senha (
  token_hash text PRIMARY KEY,
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  expira_em timestamptz NOT NULL,
  usado_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_workspace_criado ON auditoria (workspace_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_consumo_workspace_criado ON consumo_ia (workspace_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_sessoes_usuario ON sessoes_web (usuario_id);
