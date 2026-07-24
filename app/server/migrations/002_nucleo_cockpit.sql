INSERT INTO features_workspace (
  workspace_id,
  feature_id,
  ativa,
  config_json
)
SELECT
  workspace_id,
  'cockpit',
  bool_or(ativa),
  jsonb_object_agg(feature_id, config_json)
FROM features_workspace
WHERE feature_id IN ('cockpit', 'cerebro', 'fontes')
GROUP BY workspace_id
ON CONFLICT (workspace_id, feature_id) DO UPDATE
SET
  ativa = features_workspace.ativa OR EXCLUDED.ativa,
  config_json = features_workspace.config_json || EXCLUDED.config_json;

DELETE FROM features_workspace
WHERE feature_id IN ('cerebro', 'fontes');

UPDATE modelos_workspace AS modelo
SET features_json = (
  SELECT
    COALESCE(
      jsonb_agg(item) FILTER (
        WHERE id NOT IN ('cockpit', 'cerebro', 'fontes')
      ),
      '[]'::jsonb
    )
    || jsonb_build_array(
      jsonb_build_object(
        'id',
        'cockpit',
        'config',
        COALESCE(
          jsonb_object_agg(
            id,
            COALESCE(item -> 'config', '{}'::jsonb)
          ) FILTER (
            WHERE id IN ('cockpit', 'cerebro', 'fontes')
          ),
          '{}'::jsonb
        )
      )
    )
  FROM (
    SELECT
      item,
      CASE
        WHEN jsonb_typeof(item) = 'string' THEN item #>> '{}'
        ELSE item ->> 'id'
      END AS id
    FROM jsonb_array_elements(modelo.features_json) AS item
  ) AS itens
)
WHERE EXISTS (
  SELECT 1
  FROM jsonb_array_elements(modelo.features_json) AS item
  WHERE (
    CASE
      WHEN jsonb_typeof(item) = 'string' THEN item #>> '{}'
      ELSE item ->> 'id'
    END
  ) IN ('cockpit', 'cerebro', 'fontes')
);
