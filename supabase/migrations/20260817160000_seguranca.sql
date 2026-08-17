-- ExameQR — endurecimento: revogação de QR e limite do que um convite pode conceder
--
-- Duas correções independentes que só o banco pode garantir de verdade: uma
-- porque o cancelamento de exame acontece por vários caminhos, outra porque a
-- policy era o único guarda-corpo e não guardava o que importava.

-- ── 1. Cancelar o exame revoga o comprovante ─────────────────────────────────
-- O cancelamento é feito pelo navegador (`update exames set status='cancelado'`)
-- em pelo menos dois lugares, e nenhum deles tocava em `qr_codes` — nada no
-- sistema inteiro escrevia 'revogado'. Resultado: um comprovante já impresso, ou
-- já enviado por WhatsApp, continuava válido e, ao ser lido na recepção, voltava
-- o exame para 'realizado' — cobrando o parceiro por um exame cancelado.
--
-- O backend passou a recusar a leitura pelo status do exame, mas isso é a
-- segunda linha de defesa: aqui o QR deixa de existir como válido, qualquer que
-- seja o caminho do cancelamento (tela, backend, ou SQL avulso).

create or replace function public.revoga_qr_do_exame_cancelado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.qr_codes
     set status = 'revogado'
   where exame_id = new.id
     and status = 'ativo';
  return new;
end
$$;

drop trigger if exists trg_exames_revoga_qr on exames;
create trigger trg_exames_revoga_qr
  after update of status on exames
  for each row
  when (new.status = 'cancelado' and old.status is distinct from 'cancelado')
  execute function public.revoga_qr_do_exame_cancelado();

-- ── 2. Um convite não pode conceder mais poder do que quem convida tem ───────
-- As policies validavam o ESCOPO do convite (empresa/parceiro certos) e nunca o
-- VALOR de `role`. Como o gatilho `handle_new_user` concede exatamente o papel
-- escrito na linha, um coordenador de parceiro podia inserir um convite com
-- role='empresa_admin', entrar com o Google daquele e-mail e virar administrador
-- da clínica. O único freio era o `select` da tela — ou seja, o frontend.
--
-- Regra abaixo (preserva o fluxo que existe hoje):
--   owner            → qualquer papel
--   empresa-level    → qualquer papel abaixo de owner, na PRÓPRIA empresa
--   coordenador      → só papéis de parceiro, no PRÓPRIO parceiro e empresa

drop policy if exists convites_insert on convites;
create policy convites_insert on convites for insert
  with check (
    is_owner()
    or (
      is_empresa_level()
      and empresa_id = auth_empresa_id()
      and role in ('empresa_admin', 'empresa_operador', 'parceiro_coordenador', 'parceiro_funcionario')
    )
    or (
      auth_role() = 'parceiro_coordenador'
      and parceiro_id = auth_parceiro_id()
      and empresa_id = auth_empresa_id()
      and role in ('parceiro_coordenador', 'parceiro_funcionario')
    )
  );

-- Leitura e remoção seguem o mesmo recorte. O ramo do coordenador não exigia
-- `empresa_id = auth_empresa_id()`, o que deixava enxergar/apagar convites de um
-- parceiro homônimo em outra empresa.
drop policy if exists convites_read on convites;
create policy convites_read on convites for select
  using (
    is_owner()
    or (empresa_id = auth_empresa_id() and is_empresa_level())
    or (
      auth_role() = 'parceiro_coordenador'
      and parceiro_id = auth_parceiro_id()
      and empresa_id = auth_empresa_id()
    )
  );

drop policy if exists convites_delete on convites;
create policy convites_delete on convites for delete
  using (
    is_owner()
    or (empresa_id = auth_empresa_id() and is_empresa_level())
    or (
      auth_role() = 'parceiro_coordenador'
      and parceiro_id = auth_parceiro_id()
      and empresa_id = auth_empresa_id()
    )
  );

-- Convites pendentes que concedem papel de empresa e foram criados por alguém
-- que não é empresa-level nunca deveriam existir. Se houver algum, ele vira
-- inócuo aqui — é mais seguro queimá-lo do que deixá-lo esperando um login.
update convites c
   set usado_at = now()
 where c.usado_at is null
   and c.role in ('empresa_admin', 'empresa_operador')
   and exists (
     select 1 from profiles p
      where p.id = c.convidado_por
        and p.role not in ('owner', 'empresa_admin')
   );

notify pgrst, 'reload schema';
