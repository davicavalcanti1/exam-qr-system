-- Paridade Feegow para a "Fase 4" (agendamento vinculado ao exame do ExameQR).
-- Só colunas aditivas — sem drop, sem policy/função nova.
--
-- Colunas dedicadas (não reaproveita netris_*): um agendamento feito no Feegow
-- guardado em coluna nomeada "netris_..." seria trocar uma incoerência de
-- provider por outra.

alter table procedimentos add column if not exists feegow_procedimento_id integer;
alter table procedimentos add column if not exists feegow_especialidade_id integer;

alter table parceiros add column if not exists feegow_convenio_id integer;
alter table parceiros add column if not exists feegow_convenio_plano_id integer;

alter table exames add column if not exists feegow_agendamento_id text;
alter table exames add column if not exists feegow_slot jsonb;
