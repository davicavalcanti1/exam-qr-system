-- Fase 4 NetRis — cadastro/vínculo do paciente diretamente no NetRis.
-- Guardamos o idPaciente do NetRis (evita rebusca) e os dados que o NetRis
-- exige para criar um paciente novo (sexo, nascimento, telefone).

alter table pacientes add column if not exists netris_id_paciente integer;
alter table pacientes add column if not exists sexo text check (sexo in ('M','F'));
alter table pacientes add column if not exists data_nascimento date;
alter table pacientes add column if not exists telefone text;
