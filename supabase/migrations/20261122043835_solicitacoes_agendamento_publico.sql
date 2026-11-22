begin;

create schema agenda_publica;
revoke all on schema agenda_publica from public;

create table public.solicitacoes_agendamento (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id),
  profissional_id uuid not null references public.profissionais(id),
  profissional_nome text not null,
  servicos_ids uuid[] not null,
  servicos_nome text not null,
  cliente_nome text not null,
  telefone text not null,
  data date not null,
  horario time not null,
  duracao_minutos integer not null check (duracao_minutos > 0),
  valor numeric not null check (valor >= 0),
  status text not null default 'pendente' check (status in ('pendente','aprovada','recusada')),
  criado_em timestamptz not null default now(),
  decidido_em timestamptz,
  decidido_por uuid,
  agendamento_id uuid references public.agendamentos(id)
);

create index solicitacoes_empresa_status_idx
  on public.solicitacoes_agendamento (empresa_id, status, criado_em desc);
create index solicitacoes_telefone_idx
  on public.solicitacoes_agendamento (empresa_id, telefone, criado_em desc);

alter table public.solicitacoes_agendamento enable row level security;
revoke all on public.solicitacoes_agendamento from public, anon, authenticated;

create function agenda_publica.empresa(p_slug text)
returns uuid language sql stable set search_path = ''
as $$
  select case when count(*) = 1 then min(e.id::text)::uuid end from public.empresas e
  where e.slug = p_slug and e.ativa is not false and e.bloqueada is not true
$$;

create function agenda_publica.telefone_br(p_telefone text)
returns text language sql immutable set search_path = ''
as $$
  select case
    when digitos ~ '^[1-9][0-9]{9,10}$' then '55' || digitos
    when digitos ~ '^55[1-9][0-9]{9,10}$' then digitos
  end
  from (select regexp_replace(coalesce(p_telefone, ''), '[^0-9]', '', 'g') as digitos) n
$$;

create function agenda_publica.admin_saas()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from auth.users a join public.usuarios u
      on u.id = a.id or (a.email_confirmed_at is not null and lower(u.email) = lower(a.email))
    where a.id = auth.uid() and u.ativo is not false and u.perfil in ('super_admin','admin_saas')
      and auth.jwt()->>'aal' = 'aal2'
  )
$$;

create function agenda_publica.pode_decidir(p_empresa uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.empresas e where e.id = p_empresa and e.user_id = auth.uid()
  ) or exists (
    select 1 from public.usuarios_empresas v where v.empresa_id = p_empresa
      and v.user_id = auth.uid() and v.ativo and v.perfil in ('admin','administrador','owner','recepcao')
  ) or agenda_publica.admin_saas()
$$;

create function agenda_publica.equipe(p_empresa uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select agenda_publica.pode_decidir(p_empresa) or exists (
    select 1 from public.usuarios_empresas v where v.empresa_id = p_empresa and v.user_id = auth.uid() and v.ativo
  )
$$;

create function agenda_publica.servicos(p_empresa uuid, p_profissional uuid, p_ids uuid[])
returns table (nomes text, minutos integer, valor numeric)
language sql stable set search_path = ''
as $$
  select string_agg(s.nome, ' + ' order by escolha.ordem),
    (sum(coalesce(nullif(s.duracao_padrao_minutos, 0), nullif(s.duracao, 0), 60)) + 10)::integer,
    sum(greatest(coalesce(case when lower(s.promocao_ativa::text) = 'true' then s.preco_promocional end, s.preco, s.valor, 0), 0))
  from unnest(p_ids) with ordinality as escolha(id, ordem)
  join public.servicos s on s.id = escolha.id and s.empresa_id = p_empresa and s.ativo is not false
  where not exists (
    select 1 from public.profissional_servicos ps where ps.profissional_id = p_profissional
  ) or exists (
    select 1 from public.profissional_servicos ps
    where ps.profissional_id = p_profissional and ps.servico_id = s.id
  )
  having count(*) = cardinality(p_ids) and count(*) between 1 and 8
    and count(distinct s.id) = count(*)
$$;

create function agenda_publica.horarios(p_empresa uuid, p_profissional uuid, p_data date, p_minutos integer)
returns setof time language sql stable set search_path = ''
as $$
  select janela.inicio::time
  from public.profissionais p
  cross join lateral generate_series(
    p_data + coalesce(nullif(p.hora_inicio::text, '')::time, time '08:00'),
    p_data + coalesce(nullif(p.hora_fim::text, '')::time, time '18:00'),
    interval '30 minutes'
  ) as janela(inicio)
  where p.id = p_profissional and p.empresa_id = p_empresa and p.ativo is not false
    and p_data between (now() at time zone 'America/Sao_Paulo')::date
                    and (now() at time zone 'America/Sao_Paulo')::date + 60
    and janela.inicio > (now() at time zone 'America/Sao_Paulo')
    and janela.inicio + p_minutos * interval '1 minute'
      <= p_data + coalesce(nullif(p.hora_fim::text, '')::time, time '18:00')
    and not coalesce(
      janela.inicio < p_data + nullif(p.fim_almoco::text, '')::time
      and janela.inicio + p_minutos * interval '1 minute' > p_data + nullif(p.inicio_almoco::text, '')::time,
      false
    )
    and not exists (
      select 1 from public.agendamentos a where a.empresa_id = p_empresa and a.profissional_id = p_profissional
        and a.data = p_data and a.status is distinct from 'cancelado'
        and p_data + a.horario::time < janela.inicio + p_minutos * interval '1 minute'
        and p_data + a.horario::time + coalesce(a.duracao_minutos, 60) * interval '1 minute' > janela.inicio
    )
    and not exists (
      select 1 from public.bloqueios_agenda b where b.empresa_id = p_empresa and b.data = p_data
        and b.ativo is not false and (b.profissional_id is null or b.profissional_id = p_profissional)
        and p_data + nullif(coalesce(b.hora_inicio,b.horario_inicio,b.inicio), '')::time
            < janela.inicio + p_minutos * interval '1 minute'
        and p_data + nullif(coalesce(b.hora_fim,b.horario_fim,b.fim), '')::time > janela.inicio
    )
  order by janela.inicio
$$;

create function public.agendamento_publico_catalogo(p_slug text)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'nome', coalesce(nullif(e.nome_fantasia,''), e.nome),
    'servicos', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'nome', s.nome,
      'valor', greatest(coalesce(case when lower(s.promocao_ativa::text) = 'true' then s.preco_promocional end, s.preco, s.valor, 0), 0)) order by s.nome)
      from public.servicos s where s.empresa_id = e.id and s.ativo is not false), '[]'::jsonb),
    'profissionais', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome,
      'servicos_ids', coalesce((select jsonb_agg(ps.servico_id) from public.profissional_servicos ps where ps.profissional_id = p.id), '[]'::jsonb)) order by p.nome)
      from public.profissionais p where p.empresa_id = e.id and p.ativo is not false), '[]'::jsonb)
  ) from public.empresas e where e.id = agenda_publica.empresa(p_slug)
$$;

create function public.agendamento_publico_horarios(p_slug text, p_profissional uuid, p_servicos uuid[], p_data date)
returns setof text language sql stable security definer set search_path = ''
as $$
  select to_char(timestamp '2000-01-01' + (h - time '00:00'), 'HH24:MI')
  from agenda_publica.servicos(agenda_publica.empresa(p_slug), p_profissional, p_servicos) s
  cross join lateral agenda_publica.horarios(agenda_publica.empresa(p_slug), p_profissional, p_data, s.minutos) h
$$;

create function public.agendamento_publico_solicitar(
  p_slug text, p_profissional uuid, p_servicos uuid[], p_data date, p_horario time,
  p_nome text, p_telefone text
)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  empresa uuid := agenda_publica.empresa(p_slug);
  telefone_validado text := agenda_publica.telefone_br(p_telefone);
  profissional text;
  selecao record;
begin
  if empresa is null or telefone_validado is null
    or length(btrim(coalesce(p_nome,''))) not between 2 and 100 then
    raise exception 'Confira o nome e o telefone com DDD.' using errcode = '22023';
  end if;

  select p.nome into profissional from public.profissionais p
    where p.id = p_profissional and p.empresa_id = empresa and p.ativo is not false;
  select * into selecao from agenda_publica.servicos(empresa, p_profissional, p_servicos);
  if profissional is null or selecao.nomes is null
    or not exists (select 1 from agenda_publica.horarios(empresa,p_profissional,p_data,selecao.minutos) h where h = p_horario) then
    raise exception 'Horário indisponível. Escolha outra opção.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(empresa::text || ':' || telefone_validado, 0));
  if exists (
    select 1 from public.solicitacoes_agendamento s where s.empresa_id = empresa
      and s.telefone = telefone_validado and s.status = 'pendente' and s.data = p_data
      and s.horario = p_horario and s.profissional_id = p_profissional and s.servicos_ids = p_servicos
  ) then return true; end if;
  if (select count(*) from public.solicitacoes_agendamento s where s.empresa_id = empresa
      and s.telefone = telefone_validado and s.criado_em > now() - interval '1 hour') >= 5 then
    raise exception 'Limite de solicitações atingido. Aguarde antes de tentar de novo.' using errcode = '22023';
  end if;

  insert into public.solicitacoes_agendamento (empresa_id, profissional_id, profissional_nome,
    servicos_ids, servicos_nome, cliente_nome, telefone, data, horario, duracao_minutos, valor)
  values (empresa,p_profissional,profissional,p_servicos,selecao.nomes,btrim(p_nome),telefone_validado,
    p_data,p_horario,selecao.minutos,selecao.valor);
  return true;
end
$$;

create function public.agendamento_publico_pendentes(p_empresa uuid)
returns table (
  id uuid, profissional_nome text, servicos_nome text, cliente_nome text, telefone text,
  data date, horario time, valor numeric
)
language sql stable security definer set search_path = ''
as $$
  select s.id,s.profissional_nome,s.servicos_nome,s.cliente_nome,s.telefone,s.data,s.horario,s.valor
  from public.solicitacoes_agendamento s
  where s.empresa_id = p_empresa and s.status = 'pendente' and agenda_publica.pode_decidir(p_empresa)
  order by s.criado_em limit 100
$$;

create function public.agendamento_publico_decidir(p_id uuid, p_aprovar boolean)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  solicitacao public.solicitacoes_agendamento;
  cliente uuid;
  nome_cliente text;
  quantidade integer;
  reserva uuid;
  selecao record;
begin
  select * into solicitacao from public.solicitacoes_agendamento s where s.id = p_id
    and agenda_publica.pode_decidir(s.empresa_id)
  for update;
  if solicitacao.id is null or p_aprovar is null then
    raise exception 'Solicitação indisponível.' using errcode = '42501';
  end if;
  if solicitacao.status <> 'pendente' then
    if (p_aprovar and solicitacao.status = 'aprovada') or (not p_aprovar and solicitacao.status = 'recusada') then
      return solicitacao.agendamento_id;
    end if;
    raise exception 'A solicitação já foi respondida.' using errcode = '22023';
  end if;

  if p_aprovar then
    select * into selecao from agenda_publica.servicos(solicitacao.empresa_id,
      solicitacao.profissional_id,solicitacao.servicos_ids);
    -- A janela curta de aprovação é serializada com a gravação da Agenda interna.
    lock table public.agendamentos in share row exclusive mode;
    if selecao.nomes is distinct from solicitacao.servicos_nome
      or selecao.minutos is distinct from solicitacao.duracao_minutos
      or not exists (select 1 from agenda_publica.horarios(solicitacao.empresa_id,solicitacao.profissional_id,
        solicitacao.data,solicitacao.duracao_minutos) h where h = solicitacao.horario) then
      raise exception 'O horário ou os serviços mudaram. Entre em contato para combinar outro atendimento.' using errcode = '22023';
    end if;

    select count(*)::integer,min(c.id::text)::uuid,min(c.nome) into quantidade,cliente,nome_cliente
    from public.clientes c where c.empresa_id = solicitacao.empresa_id
      and agenda_publica.telefone_br(c.telefone) = solicitacao.telefone;
    if quantidade > 1 then
      raise exception 'Há mais de um cadastro com esse telefone. Confira os cadastros antes de aprovar.' using errcode = '22023';
    end if;
    if cliente is null then
      insert into public.clientes (empresa_id,nome,telefone,origem,novo_cliente,visualizado)
      values (solicitacao.empresa_id,solicitacao.cliente_nome,solicitacao.telefone,'meu_espaco',true,false)
      returning id,nome into cliente,nome_cliente;
    end if;

    insert into public.agendamentos (empresa_id,cliente_id,cliente,telefone,profissional_id,profissional,
      servico_id,servico,data,horario,duracao_minutos,valor,status,no_show,confirmado_em)
    values (solicitacao.empresa_id,cliente,nome_cliente,solicitacao.telefone,solicitacao.profissional_id,
      solicitacao.profissional_nome,solicitacao.servicos_ids[1],solicitacao.servicos_nome,solicitacao.data,
      to_char(timestamp '2000-01-01' + (solicitacao.horario - time '00:00'),'HH24:MI'),
      solicitacao.duracao_minutos,solicitacao.valor,'confirmado',false,now())
    returning id into reserva;
  end if;

  update public.solicitacoes_agendamento
  set status = case when p_aprovar then 'aprovada' else 'recusada' end,
      decidido_em = now(), decidido_por = auth.uid(), agendamento_id = reserva
  where id = p_id;
  return reserva;
end
$$;

revoke all on all functions in schema agenda_publica from public;
revoke all on function public.agendamento_publico_catalogo(text),
  public.agendamento_publico_horarios(text,uuid,uuid[],date),
  public.agendamento_publico_solicitar(text,uuid,uuid[],date,time,text,text),
  public.agendamento_publico_pendentes(uuid),
  public.agendamento_publico_decidir(uuid,boolean) from public, anon, authenticated;
grant execute on function public.agendamento_publico_catalogo(text),
  public.agendamento_publico_horarios(text,uuid,uuid[],date),
  public.agendamento_publico_solicitar(text,uuid,uuid[],date,time,text,text) to anon, authenticated;
grant execute on function public.agendamento_publico_pendentes(uuid),
  public.agendamento_publico_decidir(uuid,boolean) to authenticated;

-- A página pública usa as funções acima. Os dados da conta e da equipe ficam privados.
revoke all on public.clientes, public.agendamentos, public.anamneses_clientes, public.anamnese_respostas,
  public.anamnese_clientes, public.anamnese, public.agendamento_fotos, public.cliente_pacotes,
  public.cliente_pacote_saldos, public.cliente_pacote_usos, public.cliente_precos_servicos,
  public.financeiro, public.pagamentos, public.vw_anamnese_alertas, public.empresas,
  public.usuarios, public.usuarios_empresas, public.profiles, public.admins
  from anon, public;
  -- Somente estas funções do esquema privado são usadas por políticas do banco.
grant usage on schema agenda_publica to authenticated;
grant execute on function agenda_publica.admin_saas(), agenda_publica.pode_decidir(uuid), agenda_publica.equipe(uuid) to authenticated;

create policy ag_publico_empresa_escopo on public.empresas as restrictive for all to authenticated
  using (agenda_publica.equipe(id)) with check (user_id = (select auth.uid()) or agenda_publica.pode_decidir(id));
create policy ag_publico_vinculo_insert on public.usuarios_empresas as restrictive for insert to authenticated
  with check (agenda_publica.pode_decidir(empresa_id));
create policy ag_publico_vinculo_update on public.usuarios_empresas as restrictive for update to authenticated
  using (agenda_publica.pode_decidir(empresa_id)) with check (agenda_publica.pode_decidir(empresa_id));
create policy ag_publico_vinculo_delete on public.usuarios_empresas as restrictive for delete to authenticated
  using (agenda_publica.pode_decidir(empresa_id));

create function agenda_publica.manter_titular()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id and not agenda_publica.admin_saas() then
    raise exception 'Somente a administração pode transferir a titularidade.' using errcode = '42501';
  end if;
  return new;
end
$$;
revoke all on function agenda_publica.manter_titular() from public;
create trigger ag_publico_manter_titular before update of user_id on public.empresas
  for each row when (current_user = 'authenticated') execute function agenda_publica.manter_titular();

do $$
declare
  alvo record;
begin
  for alvo in select * from (values
    ('clientes','agenda_publica.equipe(empresa_id)'),
    ('agendamentos','agenda_publica.equipe(empresa_id)'),
    ('agendamento_fotos','exists (select 1 from public.agendamentos a where a.id = agendamento_id)'),
    ('anamneses_clientes','exists (select 1 from public.clientes c where c.id = cliente_id)'),
    ('anamnese_respostas','exists (select 1 from public.anamneses_clientes f where f.id = coalesce(anamnese_id, anamnese_cliente_id))'),
    ('cliente_pacotes','agenda_publica.equipe(empresa_id)'),
    ('cliente_pacote_saldos','exists (select 1 from public.cliente_pacotes p where p.id = cliente_pacote_id)'),
    ('cliente_precos_servicos','exists (select 1 from public.clientes c where c.id = cliente_id)'),
    ('bloqueios_agenda','agenda_publica.equipe(empresa_id)')
  ) as x(tabela, escopo)
  loop
    execute format('alter table public.%I enable row level security', alvo.tabela);
    execute format('create policy ag_publico_equipe_escopo on public.%I as restrictive for all to authenticated using (%s) with check (%s)',
      alvo.tabela, alvo.escopo, alvo.escopo);
  end loop;
end
$$;

alter view public.vw_anamnese_alertas set (security_invoker = true);
update storage.buckets set public = false where id in ('anamnese','anamneses','fotos-atendimentos');
create policy agendamento_publico_arquivos_privados on storage.objects as restrictive for all to anon
  using (bucket_id not in ('anamnese','anamneses','fotos-atendimentos'))
  with check (bucket_id not in ('anamnese','anamneses','fotos-atendimentos'));

commit;
