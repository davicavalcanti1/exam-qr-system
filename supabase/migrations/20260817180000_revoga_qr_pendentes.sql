-- ExameQR — expurgo do passivo de QRs que nunca deveriam seguir ativos
--
-- A migration anterior (20260817160000) criou `trg_exames_revoga_qr`, mas gatilho
-- só age em evento futuro: os exames cancelados ANTES dele continuaram com o
-- comprovante válido. Na medição de 17/ago havia 11 QRs ativos, e nenhum deles de
-- exame autorizado:
--
--   8 de exame CANCELADO  → comprovante impresso/no WhatsApp ainda valia
--   3 de exame REALIZADO  → nasceram de reimpressão, que cunhava token novo
--
-- O backend já recusa a leitura pelo status do exame, então isto é a segunda
-- camada — mas é a camada que torna o dado honesto: "ativo" volta a significar
-- "vale para escanear".
--
-- Idempotente: rodar de novo não faz nada, porque não sobra QR ativo nessa
-- condição.

update qr_codes q
   set status = 'revogado'
  from exames e
 where e.id = q.exame_id
   and q.status = 'ativo'
   and e.status in ('cancelado', 'realizado');

-- Conferência (aparece no output do SQL Editor). O esperado é zero.
do $$
declare
  v_restantes int;
begin
  select count(*) into v_restantes
    from qr_codes q join exames e on e.id = q.exame_id
   where q.status = 'ativo' and e.status in ('cancelado', 'realizado');
  raise notice 'QRs ativos indevidos restantes: %', v_restantes;
end $$;
