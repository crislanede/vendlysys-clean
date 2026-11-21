-- PROPOSTA PARA HOMOLOGACAO. NAO EXECUTAR EM PRODUCAO SEM TESTES DE REGRESSAO.
-- A aplicacao ainda utiliza politicas permissivas e fluxos publicos de cadastro.
-- Este arquivo e um roteiro de politica, nao uma migracao aplicada.
begin;
-- A funcao abaixo e um modelo: revisar vinculos e escopo de permissoes antes de aplicar.
create or replace function public.vendlysys_pode_acessar_empresa(p_empresa_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and (
    exists (
      select 1 from public.empresas e
      where e.id = p_empresa_id and e.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.usuarios_empresas ue
      where ue.empresa_id = p_empresa_id
        and ue.user_id = (select auth.uid())
        and ue.ativo is true
    )
    or exists (
      select 1 from public.admins a
      where lower(a.email) = lower((select auth.jwt()) ->> 'email')
        and a.ativo is true and a.perfil = 'super_admin'
    )
  );
$$;
revoke all on function public.vendlysys_pode_acessar_empresa(uuid) from public, anon;
grant execute on function public.vendlysys_pode_acessar_empresa(uuid) to authenticated;
-- ATENCAO: revisar exposicao de SECURITY DEFINER em public; preferir schema nao exposto
-- com grants controlados se as chamadas RLS permitirem.
-- POLITICAS FUTURAS (desativadas intencionalmente):
-- drop policy "Liberar acesso anon temporario" on public.empresas;
-- drop policy "Liberar acesso anon temporario" on public.financeiro;
-- drop policy "auth all financeiro" on public.financeiro;
-- drop policy "liberar tudo financeiro" on public.financeiro;
-- drop policy "auth all pagamentos" on public.pagamentos;
-- create policy financeiro_empresa_select on public.financeiro for select to authenticated
-- using ((select public.vendlysys_pode_acessar_empresa(empresa_id)));
-- create policy financeiro_empresa_insert on public.financeiro for insert to authenticated
-- with check ((select public.vendlysys_pode_acessar_empresa(empresa_id)));
-- create policy financeiro_empresa_update on public.financeiro for update to authenticated
-- using ((select public.vendlysys_pode_acessar_empresa(empresa_id)))
-- with check ((select public.vendlysys_pode_acessar_empresa(empresa_id)));
-- create policy financeiro_empresa_delete on public.financeiro for delete to authenticated
-- using ((select public.vendlysys_pode_acessar_empresa(empresa_id)));
-- Repetir separadamente para pagamentos, com permissao de operacao apropriada.
-- TESTES OBRIGATORIOS:
-- 1. anon nao le/insere/atualiza/deleta dados privados.
-- 2. usuario A so ve empresa A; usuario B so ve empresa B.
-- 3. proprietario consegue CRUD autorizado; funcionario respeita permissoes.
-- 4. super_admin somente via papel autorizado; usuarios sem vinculo sao negados.
-- 5. testar cadastro publico, Meu Espaco, agenda, financeiro e integracoes.
rollback; -- garantia extra: mesmo se executado, nao altera politicas nem cria funcao.
