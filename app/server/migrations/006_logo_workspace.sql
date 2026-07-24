-- Logo por workspace: guardada como data URL (base64) direto na coluna, com
-- limite de tamanho aplicado na rota. Logos sao pequenas (rebaixadas no cliente
-- pra 256 px), entao nao vale a pena montar servico de arquivo estatico.
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS logo text;
