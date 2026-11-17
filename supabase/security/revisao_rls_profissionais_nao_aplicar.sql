-- REVISÃO DE SEGURANÇA - NÃO APLICAR DIRETAMENTE EM PRODUÇÃO.
-- Pré-requisito: validar login, cadastro público e Meu Espaço em ambiente isolado.
-- SELECT público é mantido TEMPORARIAMENTE por compatibilidade com a agenda pública.
-- Não resolve a exposição de dados pessoais (telefone/email) no SELECT *.
begin;
drop policy if exists "Liberar acesso anon temporario" on public.profissionais;
drop policy if exists "Permitir atualizar profissionais" on public.profissionais;
drop policy if exists "Permitir excluir profissionais" on public.profissionais;
drop policy if exists "Permitir inserir profissionais" on public.profissionais;
drop policy if exists "Permitir leitura profissionais" on public.profissionais;
drop policy if exists "acesso profissionais por empresa" on public.profissionais;
drop policy if exists "auth all profissionais" on public.profissionais;
-- Mantém provisoriamente a policy SELECT "meu espaco pode listar profissionais".
-- IMPORTANTE: política pública de leitura deve ser substituída por projeção segura.
create policy "profissionais_insert_empresa" on public.profissionais
for insert to authenticated with check (
  empresa_id is not null and exists (
    select 1 from public.usuarios_empresas ue
    where ue.empresa_id = profissionais.empresa_id
      and ue.user_id = (select auth.uid())
      and ue.ativo is true
  )
);
create policy "profissionais_update_empresa" on public.profissionais
for update to authenticated
using (
  exists (select 1 from public.usuarios_empresas ue
    where ue.empresa_id = profissionais.empresa_id
      and ue.user_id = (select auth.uid()) and ue.ativo is true)
)
with check (
  empresa_id is not null and exists (
    select 1 from public.usuarios_empresas ue
    where ue.empresa_id = profissionais.empresa_id
      and ue.user_id = (select auth.uid()) and ue.ativo is true)
);
create policy "profissionais_delete_empresa" on public.profissionais
for delete to authenticated using (
  exists (select 1 from public.usuarios_empresas ue
    where ue.empresa_id = profissionais.empresa_id
      and ue.user_id = (select auth.uid()) and ue.ativo is true)
);
commit;
-- PENDÊNCIAS: testar RLS de usuarios_empresas, funções admin e serviço público,
-- impedir alteração de empresa_id via update, limitar SELECT público às colunas seguras,
-- testar autenticação real e políticas de todas as tabelas vinculadas.
