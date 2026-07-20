-- ExameQR — White-label também no nível do PARCEIRO (marca própria).
-- O coordenador do parceiro define logo + nome de exibição da sua marca.
-- Escrita de parceiros é via service role; aqui um RPC restrito deixa o
-- coordenador ajustar SÓ a marca do próprio parceiro.

alter table parceiros add column if not exists logo_url text;
alter table parceiros add column if not exists nome_exibicao text;

create or replace function public.update_parceiro_branding(p_logo text, p_nome text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.parceiros
     set logo_url = nullif(trim(p_logo), ''),
         nome_exibicao = nullif(trim(p_nome), '')
   where id = public.auth_parceiro_id() and public.auth_role() = 'parceiro_coordenador';
$$;
