-- LGPD — direito de eliminação: marca de paciente anonimizado.
-- Ao anonimizar, o PII (nome/cpf/nascimento/sexo/telefone/vínculo NetRis) é apagado,
-- mas os exames/financeiro ficam (obrigação legal de guarda).
alter table pacientes add column if not exists anonimizado boolean not null default false;
