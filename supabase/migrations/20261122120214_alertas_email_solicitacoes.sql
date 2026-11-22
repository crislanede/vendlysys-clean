begin;

create table agenda_publica.alerta_email_config (
  empresa_id uuid primary key references public.empresas(id) on delete cascade,
  email text not null,
  atualizado_em timestamptz not null default now()
);

create table agenda_publica.alerta_email_fila (
  solicitacao_id uuid primary key references public.solicitacoes_agendamento(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  destinatario text not null,
  proxima_tentativa timestamptz not null default now(),
  tentativas integer not null default 0,
  criado_em timestamptz not null default now(),
  encerrado_em timestamptz,
  enviado_em timestamptz
);

alter table agenda_publica.alerta_email_config enable row level security;
alter table agenda_publica.alerta_email_fila enable row level security;
revoke all on agenda_publica.alerta_email_config, agenda_publica.alerta_email_fila from public, anon, authenticated;
create index alerta_agenda_proxima_tentativa_idx
  on agenda_publica.alerta_email_fila(proxima_tentativa) where encerrado_em is null;

create function agenda_publica.pode_configurar_alerta(p_empresa uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select agenda_publica.admin_saas() or exists (
    select 1 from public.empresas e where e.id = p_empresa and e.user_id = auth.uid()
  ) or exists (
    select 1 from public.usuarios_empresas v where v.empresa_id = p_empresa
      and v.user_id = auth.uid() and v.ativo and v.perfil in ('admin', 'administrador', 'owner')
  )
$$;

create function public.agendamento_publico_alerta_config(p_empresa uuid)
returns text language plpgsql stable security definer set search_path = ''
as $$
begin
  if not agenda_publica.pode_configurar_alerta(p_empresa) then
    raise exception 'Configuração disponível para a administração da empresa.' using errcode = '42501';
  end if;
  return coalesce((select c.email from agenda_publica.alerta_email_config c where c.empresa_id = p_empresa), '');
end
$$;

create function public.agendamento_publico_alerta_salvar(p_empresa uuid, p_email text)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  endereco text := lower(btrim(coalesce(p_email, '')));
begin
  if not agenda_publica.pode_configurar_alerta(p_empresa) then
    raise exception 'Configuração disponível para a administração da empresa.' using errcode = '42501';
  end if;
  if endereco = '' then
    delete from agenda_publica.alerta_email_config where empresa_id = p_empresa;
    return '';
  end if;
  if length(endereco) > 254 or endereco !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    raise exception 'Informe um e-mail válido.' using errcode = '22023';
  end if;

  insert into agenda_publica.alerta_email_config(empresa_id, email)
  values (p_empresa, endereco)
  on conflict (empresa_id) do update set email = excluded.email, atualizado_em = now();
  return endereco;
end
$$;

create function agenda_publica.enfileirar_alerta_email()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into agenda_publica.alerta_email_fila(solicitacao_id, empresa_id, destinatario)
  select new.id, new.empresa_id, c.email
  from agenda_publica.alerta_email_config c
  where c.empresa_id = new.empresa_id
  on conflict (solicitacao_id) do nothing;
  return new;
end
$$;

create trigger agendamento_publico_enfileirar_alerta_email
  after insert on public.solicitacoes_agendamento
  for each row execute function agenda_publica.enfileirar_alerta_email();

create function public.agendamento_publico_alerta_buscar()
returns table(id uuid, destinatario text, tentativa integer)
language plpgsql security definer set search_path = ''
as $$
begin
  update agenda_publica.alerta_email_fila f set encerrado_em = now()
  where f.encerrado_em is null and f.proxima_tentativa <= now()
    and (f.tentativas >= 6 or f.criado_em <= now() - interval '2 hours'
      or not exists (
        select 1 from public.solicitacoes_agendamento s where s.id = f.solicitacao_id and s.status = 'pendente'
      )
      or not exists (
        select 1 from agenda_publica.alerta_email_config c
        where c.empresa_id = f.empresa_id and c.email = f.destinatario
      ));

  return query with lote as (
    select f.solicitacao_id from agenda_publica.alerta_email_fila f
    where f.encerrado_em is null and f.proxima_tentativa <= now()
    order by f.criado_em limit 3 for update skip locked
  )
  update agenda_publica.alerta_email_fila f
  set tentativas = f.tentativas + 1, proxima_tentativa = now() + interval '2 minutes'
  from lote where f.solicitacao_id = lote.solicitacao_id
  returning f.solicitacao_id, f.destinatario, f.tentativas;
end
$$;

create function public.agendamento_publico_alerta_concluir(
  p_id uuid, p_tentativa integer, p_enviado boolean, p_repetir boolean
)
returns void language sql security definer set search_path = ''
as $$
  update agenda_publica.alerta_email_fila f
  set enviado_em = case when p_enviado then now() end,
    encerrado_em = case when p_enviado or not p_repetir or f.tentativas >= 6 then now() end,
    proxima_tentativa = now() + interval '1 minute' * power(2, least(f.tentativas, 6))
  where f.solicitacao_id = p_id and f.tentativas = p_tentativa and f.encerrado_em is null
$$;

revoke all on function agenda_publica.pode_configurar_alerta(uuid), agenda_publica.enfileirar_alerta_email()
  from public, anon, authenticated;
revoke all on function public.agendamento_publico_alerta_config(uuid),
  public.agendamento_publico_alerta_salvar(uuid,text), public.agendamento_publico_alerta_buscar(),
  public.agendamento_publico_alerta_concluir(uuid,integer,boolean,boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.agendamento_publico_alerta_config(uuid),
  public.agendamento_publico_alerta_salvar(uuid,text) to authenticated;
grant execute on function public.agendamento_publico_alerta_buscar(),
  public.agendamento_publico_alerta_concluir(uuid,integer,boolean,boolean) to service_role;

-- Runtime do Supabase hospedado. A chamada só ocorre quando a fila está
-- pronta e o endereço do projeto e o segredo dedicado estão no Vault.
-- No Vault: agenda_alertas_supabase_url e agenda_alertas_worker_secret.
-- Na função: AGENDA_ALERTAS_WORKER_SECRET (o mesmo segredo), RESEND_API_KEY,
-- AGENDA_ALERTAS_FROM_EMAIL e AGENDA_ALERTAS_WEB_URL (origem HTTPS da Agenda).
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
revoke all on net.http_request_queue from public, anon, authenticated;

select cron.schedule('vendlysys-alertas-novas-solicitacoes', '* * * * *', $cron$
  select net.http_post(
    url := rtrim(url_projeto.decrypted_secret, '/') || '/functions/v1/processar-alertas-agenda',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-agenda-alertas-secret', segredo.decrypted_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  )
  from vault.decrypted_secrets url_projeto
  cross join vault.decrypted_secrets segredo
  where url_projeto.name = 'agenda_alertas_supabase_url'
    and segredo.name = 'agenda_alertas_worker_secret'
    and exists (select 1 from agenda_publica.alerta_email_fila f
      where f.encerrado_em is null and f.proxima_tentativa <= now())
$cron$);

commit;
