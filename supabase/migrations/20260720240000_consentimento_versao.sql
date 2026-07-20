-- ExameQR — LGPD: versão do texto de consentimento aceito pelo paciente.
-- Junto com consentimento_lgpd (bool) e consentimento_at (timestamp), fecha a
-- provabilidade: sabemos QUANDO e QUAL versão do texto o titular aceitou.
alter table pacientes add column if not exists consentimento_versao text;
