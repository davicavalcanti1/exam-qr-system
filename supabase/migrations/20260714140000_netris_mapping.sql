-- Fase 4 NetRis — mapeamento por parceiro para o agendamento online.
-- O procedimento já é mapeado em procedimentos.netris_procedimento_id.
-- Aqui guardamos, por parceiro, o plano-convênio/convênio do NetRis que ele usa
-- (ex.: parceiro "Boa Vista" -> idPlanoConvenio 224 / idConvenio 94).

alter table parceiros add column if not exists netris_id_plano_convenio integer;
alter table parceiros add column if not exists netris_id_convenio        integer;
alter table parceiros add column if not exists netris_id_unidade         integer;

-- guarda também no exame o retorno do agendamento (fecha o ciclo com a Fase 3).
alter table exames add column if not exists netris_agendamento_id text;
