-- ExameQR — Integração: guardar a config POR PROVEDOR (não perder ao trocar).
--
-- Antes: integracao_configs.config era uma config "plana" do provedor ativo — ao
-- trocar de provedor, a config antiga era sobrescrita. Agora config vira um MAPA
-- { netris: {...}, feegow: {...}, ... }; o campo `provider` diz qual está ATIVO.
-- Trocar de provedor = mudar `provider`; as credenciais de cada um permanecem.
--
-- Converte as linhas existentes (config plana) para o mapa, aninhando sob o
-- provedor atual. Idempotente: pula o que já está no formato de mapa.

update integracao_configs
set config = jsonb_build_object(coalesce(provider, 'manual'), coalesce(config, '{}'::jsonb))
where config is not null
  and not (config ? 'netris' or config ? 'feegow' or config ? 'manual');
