begin;

create schema if not exists vendly_portal;
revoke all on schema vendly_portal from public;
grant usage on schema vendly_portal to anon, authenticated;

create function vendly_portal.telefone_br(numero text)
returns text language sql immutable set search_path = ''
as $$
  select case
    when digitos ~ '^[1-9][0-9]{9,10}$' then '55' || digitos
    when digitos ~ '^55[1-9][0-9]{9,10}$' then digitos
  end
  from (select pg_catalog.regexp_replace(coalesce(numero, ''), '[^0-9]', '', 'g') as digitos) n
$$;

create function vendly_portal.telefone_verificado()
returns text language sql stable security definer set search_path = ''
as $$
  select vendly_portal.telefone_br(u.phone)
  from auth.users u
  where u.id = auth.uid()
    and u.phone_confirmed_at is not null
    and vendly_portal.telefone_br(u.phone) = vendly_portal.telefone_br(auth.jwt()->>'phone')
    and exists (
      select 1 from auth.sessions s
      where s.user_id = u.id and s.id::text = auth.jwt()->>'session_id'
        and s.created_at > now() - interval '30 days'
    )
$$;

create function vendly_portal.conta_cliente()
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce(nullif(auth.jwt()->>'phone', ''), '') <> '' or exists (
    select 1 from auth.users u where u.id = auth.uid() and nullif(u.phone, '') is not null
  )
$$;

create function vendly_portal.super_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select not vendly_portal.conta_cliente() and exists (
    select 1 from auth.users a join public.usuarios u
      on u.id = a.id or (
        a.email_confirmed_at is not null and pg_catalog.lower(u.email) = pg_catalog.lower(a.email)
      )
    where a.id = auth.uid() and u.ativo is not false
      and u.perfil in ('super_admin', 'admin_saas')
  )
$$;

create function vendly_portal.equipe_empresa(empresa uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select not vendly_portal.conta_cliente() and (
    exists (
      select 1 from public.usuarios_empresas v
      where v.empresa_id = empresa and v.user_id = auth.uid() and v.ativo
    ) or exists (
      select 1 from public.empresas e where e.id = empresa and e.user_id = auth.uid()
    ) or vendly_portal.super_admin()
  )
$$;

create function vendly_portal.gerencia_empresa(empresa uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select not vendly_portal.conta_cliente() and (
    exists (
      select 1 from public.usuarios_empresas v where v.empresa_id = empresa
        and v.user_id = auth.uid() and v.ativo and v.perfil in ('admin', 'administrador', 'owner')
    ) or exists (
      select 1 from public.empresas e where e.id = empresa and e.user_id = auth.uid()
    ) or vendly_portal.super_admin()
  )
$$;

create index if not exists clientes_empresa_telefone_portal_idx
  on public.clientes (empresa_id, vendly_portal.telefone_br(telefone));

create function vendly_portal.cliente_da_sessao(empresa uuid)
returns uuid language sql stable security definer set search_path = ''
as $$
  select case when count(*) = 1 then min(c.id::text)::uuid end
  from public.clientes c
  where c.empresa_id = empresa and c.ativo is not false
    and vendly_portal.telefone_br(c.telefone) = (select vendly_portal.telefone_verificado())
$$;

create function vendly_portal.e_cliente(cliente uuid, empresa uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce(cliente = vendly_portal.cliente_da_sessao(empresa), false)
$$;

create function vendly_portal.acessa_agendamento(agendamento uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.agendamentos a
    where a.id = agendamento and (
      vendly_portal.equipe_empresa(a.empresa_id) or vendly_portal.e_cliente(a.cliente_id, a.empresa_id)
    )
  )
$$;

revoke all on all functions in schema vendly_portal from public;
grant execute on all functions in schema vendly_portal to authenticated;
grant execute on function vendly_portal.telefone_verificado() to anon;

create function public.meu_espaco_disponivel()
returns boolean language sql stable set search_path = ''
as $$ select true $$;

create function public.meu_espaco_contexto(p_slug text default null, p_token text default null)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  empresa uuid;
  cliente uuid;
  reserva uuid;
  telefone_validado text := vendly_portal.telefone_verificado();
begin
  if telefone_validado is null then raise exception 'Verifique seu WhatsApp.' using errcode = '42501'; end if;

  if nullif(p_slug, '') is not null then
    select e.id into empresa from public.empresas e
    where e.slug = p_slug and e.ativa is not false and e.bloqueada is not true;
  elsif nullif(p_token, '') is not null then
    select a.empresa_id, a.id into empresa, reserva
    from public.agendamentos a join public.empresas e on e.id = a.empresa_id
    where a.token_cliente = p_token and a.token_ativo is not false
      and (a.token_expira_em is null or a.token_expira_em > now())
      and e.ativa is not false and e.bloqueada is not true
      and vendly_portal.e_cliente(a.cliente_id, a.empresa_id);
  else
    select case when count(*) = 1 then min(empresas.id::text)::uuid end into empresa
    from (
      select distinct e.id from public.clientes c join public.empresas e on e.id = c.empresa_id
      where vendly_portal.telefone_br(c.telefone) = telefone_validado and c.ativo is not false
        and e.ativa is not false and e.bloqueada is not true
    ) empresas;
  end if;

  if empresa is null then return jsonb_build_object('status', 'link_necessario'); end if;

  cliente := vendly_portal.cliente_da_sessao(empresa);
  if cliente is null and exists (
    select 1 from public.clientes c where c.empresa_id = empresa
      and vendly_portal.telefone_br(c.telefone) = telefone_validado
  ) then
    return jsonb_build_object('status', 'procurar_estabelecimento');
  end if;

  return jsonb_build_object('status', case when cliente is null then 'cadastro' else 'cliente' end,
    'empresa_id', empresa, 'cliente_id', cliente, 'agendamento_id', reserva);
end
$$;

create function public.meu_espaco_cadastrar(
  p_slug text, p_nome text, p_email text, p_nascimento date,
  p_cep text, p_endereco text, p_numero text, p_bairro text, p_cidade text, p_estado text
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  contexto jsonb;
  empresa uuid;
  novo_cliente uuid;
  telefone_validado text := vendly_portal.telefone_verificado();
begin
  if telefone_validado is null or nullif(p_slug, '') is null or nullif(btrim(p_nome), '') is null then
    raise exception 'Confira os dados do cadastro.' using errcode = '22023';
  end if;
  contexto := public.meu_espaco_contexto(p_slug);
  empresa := (contexto->>'empresa_id')::uuid;
  if empresa is null then raise exception 'Estabelecimento indisponível.' using errcode = '22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(empresa::text || ':' || telefone_validado, 0));
  contexto := public.meu_espaco_contexto(p_slug);
  if contexto->>'status' = 'cliente' then return (contexto->>'cliente_id')::uuid; end if;
  if contexto->>'status' <> 'cadastro' then
    raise exception 'Procure o estabelecimento para atualizar seu cadastro.' using errcode = '42501';
  end if;

  insert into public.clientes (empresa_id, nome, telefone, email, data_nascimento, cep, endereco,
    numero, bairro, cidade, estado, origem, novo_cliente, visualizado)
  values (empresa, btrim(p_nome), telefone_validado, nullif(btrim(p_email), ''), p_nascimento,
    nullif(p_cep, ''), nullif(p_endereco, ''), nullif(p_numero, ''), nullif(p_bairro, ''),
    nullif(p_cidade, ''), nullif(p_estado, ''), 'meu_espaco', true, false)
  returning id into novo_cliente;
  return novo_cliente;
end
$$;

create function public.meu_espaco_ocupacao(p_empresa uuid, p_profissional uuid, p_data date)
returns table (id uuid, horario text, duracao_minutos integer, status text)
language sql stable security definer set search_path = ''
as $$
  select case when vendly_portal.e_cliente(a.cliente_id, a.empresa_id) then a.id end,
    a.horario::text, a.duracao_minutos::integer, a.status::text
  from public.agendamentos a
  where a.empresa_id = p_empresa and a.profissional_id = p_profissional and a.data = p_data
    and a.status <> 'cancelado'
    and (vendly_portal.cliente_da_sessao(p_empresa) is not null or vendly_portal.equipe_empresa(p_empresa))
$$;

create function public.meu_espaco_configuracoes(p_empresa uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'nome', e.nome, 'nome_fantasia', e.nome_fantasia, 'slug', e.slug, 'logo_url', e.logo_url,
    'telefone', e.telefone, 'whatsapp', e.whatsapp_numero, 'endereco', e.endereco,
    'cidade', e.cidade, 'estado', e.estado, 'banner_cliente_ativo', e.banner_cliente_ativo,
    'banner_cliente_categoria', e.banner_cliente_categoria, 'banner_cliente_titulo', e.banner_cliente_titulo,
    'banner_cliente_texto', e.banner_cliente_texto, 'banner_cliente_botao_texto', e.banner_cliente_botao_texto,
    'banner_cliente_botao_link', e.banner_cliente_botao_link, 'banner_cliente_imagem_url', e.banner_cliente_imagem_url,
    'banner_cliente_pos_x', e.banner_cliente_pos_x, 'banner_cliente_pos_y', e.banner_cliente_pos_y,
    'banner_cliente_zoom', e.banner_cliente_zoom
  )
  from public.empresas e
  where e.id = p_empresa and vendly_portal.cliente_da_sessao(e.id) is not null
$$;

create function public.meu_espaco_reservar(
  p_cliente uuid, p_profissional uuid, p_servicos uuid[], p_data date,
  p_horario time without time zone, p_reserva uuid default null
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  cadastro public.clientes;
  profissional public.profissionais;
  inicio timestamp;
  termino timestamp;
  duracao integer;
  servicos text;
  valor numeric;
  quantidade integer;
  reserva uuid;
begin
  select c.* into cadastro from public.clientes c
    where c.id = p_cliente and vendly_portal.e_cliente(c.id, c.empresa_id);
  if not found then raise exception 'Cadastro não autorizado.' using errcode = '42501'; end if;

  select p.* into profissional from public.profissionais p
    where p.id = p_profissional and p.empresa_id = cadastro.empresa_id and p.ativo is not false;
  if not found then raise exception 'Profissional indisponível.' using errcode = '22023'; end if;

  if p_data is null or p_horario is null or cardinality(p_servicos) not between 1 and 30
    or p_data < (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'Confira a data, o horário e os serviços.' using errcode = '22023';
  end if;

  select count(*), string_agg(s.nome, ' + ' order by escolha.ordem),
    sum(coalesce(nullif(s.duracao_padrao_minutos, 0), nullif(s.duracao, 0), 60)) + 10,
    sum(coalesce(especial.valor_especial,
      case when lower(s.promocao_ativa::text) = 'true' then s.preco_promocional end,
      s.preco, s.valor, 0))
  into quantidade, servicos, duracao, valor
  from unnest(p_servicos) with ordinality as escolha(id, ordem)
  join public.servicos s on s.id = escolha.id and s.empresa_id = cadastro.empresa_id and s.ativo is not false
  left join lateral (
    select min(v.valor_especial) as valor_especial
    from public.cliente_precos_servicos v
    where v.cliente_id = p_cliente and v.servico_id = s.id and v.ativo and v.valor_especial >= 0
  ) especial on true;
  if quantidade = 0 or quantidade <> cardinality(p_servicos) or duracao <= 10 then
    raise exception 'Selecione serviços válidos.' using errcode = '22023';
  end if;

  inicio := p_data + p_horario;
  termino := inicio + (duracao * interval '1 minute');
  if p_horario < coalesce(nullif(profissional.hora_inicio::text, '')::time, time '08:00')
    or termino > p_data + coalesce(nullif(profissional.hora_fim::text, '')::time, time '18:00')
    or (profissional.inicio_almoco is not null and profissional.fim_almoco is not null
      and p_horario < nullif(profissional.fim_almoco::text, '')::time
      and termino > p_data + nullif(profissional.inicio_almoco::text, '')::time) then
    raise exception 'O atendimento não cabe no horário do profissional.' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_profissional::text || ':' || p_data::text, 0));
  if exists (
    select 1 from public.agendamentos a
    where a.empresa_id = cadastro.empresa_id and a.profissional_id = p_profissional
      and a.data = p_data and a.status <> 'cancelado' and a.id is distinct from p_reserva
      and p_data + a.horario::time < termino
      and p_data + a.horario::time + (coalesce(a.duracao_minutos, 60) * interval '1 minute') > inicio
  ) then
    raise exception 'Já existe um agendamento nesse intervalo. Escolha outro horário.' using errcode = '23505';
  end if;

  if p_reserva is not null then
    update public.agendamentos
    set data = p_data, horario = p_horario, profissional_id = p_profissional, profissional = profissional.nome,
      servico_id = p_servicos[1], servico = servicos, duracao_minutos = duracao, status = 'agendado',
      observacoes = 'Agendamento reagendado pelo Meu Espaço. Serviços: ' || servicos
    where id = p_reserva and cliente_id = p_cliente and empresa_id = cadastro.empresa_id
      and status in ('agendado','confirmado')
    returning id into reserva;
    if reserva is null then raise exception 'Agendamento indisponível para reagendar.' using errcode = '42501'; end if;
    return reserva;
  end if;

  insert into public.agendamentos (empresa_id, cliente_id, cliente, profissional_id, profissional,
    servico_id, servico, data, horario, duracao_minutos, status, no_show, observacoes)
  values (cadastro.empresa_id, p_cliente, cadastro.nome, p_profissional, profissional.nome,
    p_servicos[1], servicos, p_data, p_horario, duracao, 'agendado', false,
    'Agendamento realizado pelo Meu Espaço. Serviços: ' || servicos)
  returning id into reserva;
  insert into public.financeiro (empresa_id, tipo, descricao, valor, data_lancamento, status,
    cliente, profissional, servico, agendamento_id, observacoes)
  values (cadastro.empresa_id, 'entrada', 'Agendamento pelo cliente: ' || servicos, valor,
    p_data, 'pendente', cadastro.nome, profissional.nome, servicos, reserva,
    'Lançamento gerado automaticamente pelo Meu Espaço.');
  return reserva;
end
$$;

revoke all on function public.meu_espaco_configuracoes(uuid) from public, anon;
revoke all on function public.meu_espaco_reservar(uuid, uuid, uuid[], date, time without time zone, uuid) from public, anon;
grant execute on function public.meu_espaco_configuracoes(uuid) to authenticated;
grant execute on function public.meu_espaco_reservar(uuid, uuid, uuid[], date, time without time zone, uuid) to authenticated;

revoke all on function public.meu_espaco_disponivel() from public;
grant execute on function public.meu_espaco_disponivel() to anon, authenticated;
revoke all on function public.meu_espaco_contexto(text, text) from public, anon;
revoke all on function public.meu_espaco_cadastrar(text, text, text, date, text, text, text, text, text, text) from public, anon;
revoke all on function public.meu_espaco_ocupacao(uuid, uuid, date) from public, anon;
grant execute on function public.meu_espaco_contexto(text, text) to authenticated;
grant execute on function public.meu_espaco_cadastrar(text, text, text, date, text, text, text, text, text, text) to authenticated;
grant execute on function public.meu_espaco_ocupacao(uuid, uuid, date) to authenticated;

-- As políticas restritivas também limitam permissões permissivas que já existiam.
do $$
declare
  alvo record;
  condicao text;
begin
  for alvo in select * from (values
    ('clientes', 'vendly_portal.equipe_empresa(empresa_id) OR vendly_portal.e_cliente(id, empresa_id)'),
    ('agendamentos', 'vendly_portal.equipe_empresa(empresa_id) OR vendly_portal.e_cliente(cliente_id, empresa_id)'),
    ('agendamento_fotos', 'vendly_portal.acessa_agendamento(agendamento_id)'),
    ('anamneses_clientes', 'exists (select 1 from public.clientes c where c.id = cliente_id)'),
    ('anamnese_respostas', 'exists (select 1 from public.anamneses_clientes f where f.id = coalesce(anamnese_id, anamnese_cliente_id))'),
    ('cliente_pacotes', 'vendly_portal.equipe_empresa(empresa_id) OR vendly_portal.e_cliente(cliente_id, empresa_id)'),
    ('cliente_pacote_saldos', 'exists (select 1 from public.cliente_pacotes p where p.id = cliente_pacote_id)'),
    ('cliente_precos_servicos', 'exists (select 1 from public.clientes c where c.id = cliente_id)'),
    ('anamnese_clientes', 'not (select vendly_portal.conta_cliente())'),
    ('anamnese', 'not (select vendly_portal.conta_cliente())'),
    ('cliente_pacote_usos', 'not (select vendly_portal.conta_cliente())')
  ) as x(tabela, escopo)
  loop
    execute format('alter table public.%I enable row level security', alvo.tabela);
    execute format('revoke all on public.%I from anon, public', alvo.tabela);
    condicao := alvo.escopo;
    execute format('create policy portal_limite on public.%I as restrictive for all to authenticated using (%s) with check (%s)',
      alvo.tabela, condicao, condicao);
    execute format('create policy portal_leitura on public.%I for select to authenticated using (%s)',
      alvo.tabela, condicao);
  end loop;
end
$$;

create policy portal_cliente_editar on public.clientes for update to authenticated
  using (vendly_portal.e_cliente(id, empresa_id)) with check (vendly_portal.e_cliente(id, empresa_id));
create policy portal_sem_reserva_direta on public.agendamentos as restrictive for insert to authenticated
  with check (not (select vendly_portal.conta_cliente()) or vendly_portal.equipe_empresa(empresa_id));
create policy portal_alterar_agendamento on public.agendamentos for update to authenticated
  using (vendly_portal.e_cliente(cliente_id, empresa_id)) with check (vendly_portal.e_cliente(cliente_id, empresa_id));
create policy portal_ficha_escrever on public.anamneses_clientes for all to authenticated
  using (exists (select 1 from public.clientes c where c.id = cliente_id))
  with check (exists (select 1 from public.clientes c where c.id = cliente_id));
create policy portal_respostas_escrever on public.anamnese_respostas for all to authenticated
  using (exists (select 1 from public.anamneses_clientes f where f.id = coalesce(anamnese_id, anamnese_cliente_id)))
  with check (exists (select 1 from public.anamneses_clientes f where f.id = coalesce(anamnese_id, anamnese_cliente_id)));

-- Perfis autenticados pelo telefone não ganham acesso aos módulos da equipe.
do $$
declare
  tabela text;
  categoria text;
begin
  for tabela in select c.relname from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
    and c.relname not in ('clientes', 'agendamentos', 'agendamento_fotos', 'anamneses_clientes',
      'anamnese_respostas', 'cliente_pacotes', 'cliente_pacote_saldos', 'cliente_precos_servicos',
      'anamnese_clientes', 'anamnese', 'cliente_pacote_usos',
      'mfa_recovery_approvers', 'mfa_recovery_requests', 'mfa_recovery_audit')
  loop
    execute format('alter table public.%I enable row level security', tabela);
    if tabela = any (array['profissionais','servicos','anamnese_modelos','anamnese_campos','marketing_pacotes']) then
      categoria := case
        when tabela = 'anamnese_campos' then null
        else 'empresa_id'
      end;
      if categoria is null then
        execute format('create policy portal_catalogo_limite on public.%I as restrictive for select to authenticated using (not (select vendly_portal.conta_cliente()) or exists (select 1 from public.anamnese_modelos m where m.id = modelo_id))', tabela);
        execute format('create policy portal_catalogo_leitura on public.%I for select to authenticated using (exists (select 1 from public.anamnese_modelos m where m.id = modelo_id))', tabela);
      else
        execute format('create policy portal_catalogo_limite on public.%I as restrictive for select to authenticated using (not (select vendly_portal.conta_cliente()) or vendly_portal.equipe_empresa(%I) or vendly_portal.cliente_da_sessao(%I) is not null)', tabela, categoria, categoria);
        execute format('create policy portal_catalogo_leitura on public.%I for select to authenticated using (vendly_portal.cliente_da_sessao(%I) is not null)', tabela, categoria);
      end if;
      execute format('create policy portal_catalogo_sem_insert on public.%I as restrictive for insert to authenticated with check (not (select vendly_portal.conta_cliente()))', tabela);
      execute format('create policy portal_catalogo_sem_update on public.%I as restrictive for update to authenticated using (not (select vendly_portal.conta_cliente())) with check (not (select vendly_portal.conta_cliente()))', tabela);
      execute format('create policy portal_catalogo_sem_delete on public.%I as restrictive for delete to authenticated using (not (select vendly_portal.conta_cliente()))', tabela);
    else
      execute format('create policy portal_bloqueio_interno on public.%I as restrictive for all to authenticated using (not (select vendly_portal.conta_cliente())) with check (not (select vendly_portal.conta_cliente()))', tabela);
    end if;
  end loop;
end
$$;

-- O vínculo com a empresa é parte da autorização dos dados privados.
create policy portal_empresas_leitura on public.empresas as restrictive for select to authenticated
  using (vendly_portal.equipe_empresa(id));
create policy portal_empresas_insert on public.empresas as restrictive for insert to authenticated
  with check (user_id = (select auth.uid()) or (select vendly_portal.super_admin()));
create policy portal_empresas_update on public.empresas as restrictive for update to authenticated
  using (vendly_portal.gerencia_empresa(id)) with check (vendly_portal.gerencia_empresa(id));
create policy portal_empresas_delete on public.empresas as restrictive for delete to authenticated
  using (vendly_portal.gerencia_empresa(id));

create function vendly_portal.preservar_titular_empresa()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id and not vendly_portal.super_admin() then
    raise exception 'Somente a administração pode transferir uma empresa.' using errcode = '42501';
  end if;
  return new;
end
$$;
create trigger portal_empresas_titular before update on public.empresas
  for each row when (current_user = 'authenticated') execute function vendly_portal.preservar_titular_empresa();

create policy portal_vinculo_insert on public.usuarios_empresas as restrictive for insert to authenticated
  with check (vendly_portal.gerencia_empresa(empresa_id));
create policy portal_vinculo_update on public.usuarios_empresas as restrictive for update to authenticated
  using (vendly_portal.gerencia_empresa(empresa_id)) with check (vendly_portal.gerencia_empresa(empresa_id));
create policy portal_vinculo_delete on public.usuarios_empresas as restrictive for delete to authenticated
  using (vendly_portal.gerencia_empresa(empresa_id));

-- O papel authenticated também é usado para a sessão da cliente. Esta regra
-- impede que políticas antigas de ALL lhe deem poder de remover registros.
do $$
declare
  tabela text;
begin
  foreach tabela in array array['clientes','agendamentos','agendamento_fotos','anamneses_clientes',
    'anamnese_respostas','cliente_pacotes','cliente_pacote_saldos','cliente_precos_servicos']
  loop
    execute format('create policy portal_sem_delete on public.%I as restrictive for delete to authenticated using (not (select vendly_portal.conta_cliente()))', tabela);
  end loop;
  foreach tabela in array array['agendamento_fotos','cliente_pacotes','cliente_pacote_saldos','cliente_precos_servicos']
  loop
    execute format('create policy portal_sem_insert on public.%I as restrictive for insert to authenticated with check (not (select vendly_portal.conta_cliente()))', tabela);
    execute format('create policy portal_sem_update on public.%I as restrictive for update to authenticated using (not (select vendly_portal.conta_cliente())) with check (not (select vendly_portal.conta_cliente()))', tabela);
  end loop;
end
$$;

-- As atualizações de autosserviço só podem alterar os campos dos formulários.
create function vendly_portal.limitar_escrita()
returns trigger language plpgsql set search_path = ''
as $$
declare
  autorizados text[];
begin
  if not vendly_portal.conta_cliente() or vendly_portal.equipe_empresa(new.empresa_id) then return new; end if;
  if tg_table_name = 'clientes' then
    if tg_op = 'INSERT' then
      raise exception 'Use o cadastro do Meu Espaço.' using errcode = '42501';
    end if;
    autorizados := array['nome','email','data_nascimento','cep','endereco','numero','bairro','cidade','estado','updated_at','atualizado_em'];
  else
    if new.status not in ('confirmado','cancelado') or new.status is null
      or old.status is null or old.status not in ('agendado','confirmado') then
      raise exception 'Este agendamento não pode mais ser alterado.' using errcode = '42501';
    end if;
    autorizados := array['status','updated_at','confirmado_em','cancelado_em'];
  end if;
  if pg_catalog.to_jsonb(new) - autorizados is distinct from pg_catalog.to_jsonb(old) - autorizados then
    raise exception 'Alteração fora do autoatendimento.' using errcode = '42501';
  end if;
  return new;
end
$$;

-- O cadastro acima é executado pelo dono da função e não por escrita direta.
create trigger portal_cliente_escrita before update on public.clientes
  for each row when (current_user = 'authenticated') execute function vendly_portal.limitar_escrita();
create trigger portal_agendamento_escrita before update on public.agendamentos
  for each row when (current_user = 'authenticated') execute function vendly_portal.limitar_escrita();
create policy portal_cliente_sem_insert on public.clientes as restrictive for insert to authenticated
  with check (not (select vendly_portal.conta_cliente()));

-- Arquivos das fichas e fotos exigem autorização para a mesma cliente.
update storage.buckets set public = false where id in ('anamnese', 'anamneses', 'fotos-atendimentos');

create function vendly_portal.acessa_arquivo(balde text, caminho text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select case when balde = 'fotos-atendimentos' then exists (
    select 1 from public.agendamento_fotos f
    where (f.caminho = caminho or f.url_foto = caminho) and vendly_portal.acessa_agendamento(f.agendamento_id)
  ) else exists (
    select 1 from public.anamneses_clientes f join public.clientes c on c.id = f.cliente_id
    where pg_catalog.replace(pg_catalog.lower(caminho), '-', '') like '%' || pg_catalog.replace(f.id::text, '-', '') || '%'
      and (vendly_portal.equipe_empresa(c.empresa_id) or vendly_portal.e_cliente(c.id, c.empresa_id))
  ) end
$$;
revoke all on function vendly_portal.acessa_arquivo(text, text) from public;
grant execute on function vendly_portal.acessa_arquivo(text, text) to authenticated;

create policy portal_storage_anon on storage.objects as restrictive for all to anon
  using (bucket_id not in ('anamnese', 'anamneses', 'fotos-atendimentos'))
  with check (bucket_id not in ('anamnese', 'anamneses', 'fotos-atendimentos'));
create policy portal_storage_leitura on storage.objects for select to authenticated
  using (bucket_id in ('anamnese','anamneses','fotos-atendimentos') and vendly_portal.acessa_arquivo(bucket_id, name));
create policy portal_storage_limite on storage.objects as restrictive for select to authenticated
  using (bucket_id not in ('anamnese','anamneses','fotos-atendimentos') or vendly_portal.acessa_arquivo(bucket_id, name));
create policy portal_storage_cliente_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'anamnese' and name ~ '^pdfs/[0-9a-f-]{36}/[0-9a-f-]{36}[.]pdf$' and vendly_portal.acessa_arquivo(bucket_id, name));
create policy portal_storage_insert_limite on storage.objects as restrictive for insert to authenticated
  with check (not (select vendly_portal.conta_cliente())
    or (bucket_id = 'anamnese' and name ~ '^pdfs/[0-9a-f-]{36}/[0-9a-f-]{36}[.]pdf$' and vendly_portal.acessa_arquivo(bucket_id, name)));
create policy portal_storage_update_limite on storage.objects as restrictive for update to authenticated
  using (not (select vendly_portal.conta_cliente()))
  with check (not (select vendly_portal.conta_cliente()));
create policy portal_storage_delete_limite on storage.objects as restrictive for delete to authenticated
  using (not (select vendly_portal.conta_cliente()));

revoke all on public.financeiro, public.pagamentos, public.usuarios, public.usuarios_empresas,
  public.profiles, public.admins, public.empresas from anon, public;
alter view public.vw_anamnese_alertas set (security_invoker = true);
revoke all on public.vw_anamnese_alertas from anon, public;

commit;
