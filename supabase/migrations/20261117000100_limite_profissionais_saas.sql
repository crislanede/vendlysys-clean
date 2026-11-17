-- VendlySys: limite transacional de profissionais por empresa.
-- REVISAR ANTES DE EXECUTAR: o projeto Supabase conectado também atende produção.
-- Esta migration NÃO corrige as políticas RLS permissivas existentes.
create or replace function public.validar_limite_profissionais_saas()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_plano text;
  v_limite integer;
  v_ativos bigint;
begin
  -- Apenas novas ativações precisam consumir uma vaga.
  if new.ativo is false then
    return new;
  end if;
  if tg_op = 'UPDATE'
     and old.ativo is distinct from false
     and old.empresa_id is not distinct from new.empresa_id then
    return new;
  end if;
  if new.empresa_id is null then
    raise exception 'Profissional precisa estar vinculado a uma empresa'
      using errcode = '23514';
  end if;
  -- Bloqueio na linha da empresa serializa cadastros simultâneos.
  select e.plano into v_plano
  from public.empresas e
  where e.id = new.empresa_id
  for update;
  if not found then
    raise exception 'Empresa não encontrada' using errcode = '23503';
  end if;
  v_limite := case v_plano
    when 'basico' then 1
    when 'profissional' then 5
    when 'premium' then 15
    when 'vitalicio' then 15
    else null
  end;
  if v_limite is null then
    raise exception 'Plano sem limite configurado: %', coalesce(v_plano, '(nulo)')
      using errcode = '23514';
  end if;
  select count(*) into v_ativos
  from public.profissionais p
  where p.empresa_id = new.empresa_id
    and p.ativo is distinct from false
    and p.id is distinct from new.id;
  if v_ativos >= v_limite then
    raise exception 'Limite de % profissionais ativos atingido para o plano %', v_limite, v_plano
      using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.validar_limite_profissionais_saas() from public, anon, authenticated;
drop trigger if exists trg_validar_limite_profissionais_saas on public.profissionais;
create trigger trg_validar_limite_profissionais_saas
before insert or update of ativo, empresa_id
on public.profissionais
for each row execute function public.validar_limite_profissionais_saas();

-- TODO antes do lançamento: revisar políticas RLS em profissionais e empresas,
-- inclusive políticas anon/USING true. Não confiar apenas neste trigger para isolamento.
