-- Fase 4 NetRis — horário escolhido no cadastro fica PENDENTE até a autorização.
-- O funcionário escolhe o slot; a requisição ao NetRis (encaixe) só é enviada
-- quando o coordenador autoriza o exame.

alter table exames add column if not exists netris_slot jsonb;
