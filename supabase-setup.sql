-- «Между нами»: база для бесплатной публикации через Supabase + GitHub Pages.
-- Запускайте целиком в Supabase -> SQL Editor -> Run.
-- Скрипт не содержит паролей, email или других личных данных.

create extension if not exists pgcrypto;

create table if not exists public.pairs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  theme text not null default 'rose',
  accent text not null default 'rose',
  background_key text,
  relationship_date text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null default '',
  role text not null default 'partner',
  status text not null default 'active',
  avatar_key text,
  bio text not null default '',
  birth_date text not null default '',
  joined_at timestamptz not null default now()
);
create index if not exists idx_members_pair_id on public.members(pair_id);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  author_user_id uuid not null,
  title text not null,
  event_date text not null,
  event_time text not null default '',
  description text not null default '',
  category text not null default 'general',
  marker text not null default 'dot',
  color text not null default '#E75078',
  photo_key text,
  cancelled boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_events_pair_date on public.events(pair_id,event_date);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  author_user_id uuid not null,
  title text not null,
  content text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_notes_pair_id on public.notes(pair_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  author_user_id uuid not null,
  author_name text not null,
  content text not null default '',
  photo_key text,
  created_at timestamptz not null default now()
);
create index if not exists idx_messages_pair_created on public.messages(pair_id,created_at);

create table if not exists public.wishes (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  author_user_id uuid not null,
  author_name text not null,
  title text not null,
  details text not null default '',
  link text not null default '',
  photo_key text,
  price text not null default '',
  priority text not null default 'nice',
  reserved_by uuid,
  fulfilled boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_wishes_pair_id on public.wishes(pair_id);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  author_user_id uuid not null,
  author_name text not null,
  title text not null,
  letter text not null,
  event_date text not null,
  event_time text not null default '',
  place text not null default '',
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
create index if not exists idx_invitations_pair_id on public.invitations(pair_id);

create table if not exists public.partner_aliases (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  owner_user_id uuid not null,
  target_user_id uuid not null,
  alias text not null,
  unique(owner_user_id,target_user_id)
);
create index if not exists idx_alias_pair_id on public.partner_aliases(pair_id);

create table if not exists public.secret_messages (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  author_user_id uuid not null,
  author_name text not null,
  cipher_text text not null,
  iv text not null,
  kind text not null default 'text',
  media_key text,
  expires_at text,
  created_at timestamptz not null default now()
);
create index if not exists idx_secret_pair_created on public.secret_messages(pair_id,created_at);

-- Клиент не читает таблицы напрямую: всё проходит через две проверяющие RPC-функции.
alter table public.pairs enable row level security;
alter table public.members enable row level security;
alter table public.events enable row level security;
alter table public.notes enable row level security;
alter table public.messages enable row level security;
alter table public.wishes enable row level security;
alter table public.invitations enable row level security;
alter table public.partner_aliases enable row level security;
alter table public.secret_messages enable row level security;

revoke all on public.pairs, public.members, public.events, public.notes, public.messages, public.wishes, public.invitations, public.partner_aliases, public.secret_messages from anon, authenticated;

create or replace function public.mn_clean(value text, max_len integer)
returns text language sql immutable as $$
  select left(trim(coalesce(value,'')), greatest(max_len,0));
$$;

create or replace function public.mn_user_in_pair(p_pair_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.members
    where pair_id=p_pair_id and user_id=auth.uid() and status='active'
  );
$$;

create or replace function public.mn_invite_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
  attempt int;
begin
  for attempt in 1..20 loop
    code := '';
    for i in 1..6 loop
      code := code || substr(chars, 1 + floor(random()*length(chars))::int, 1);
    end loop;
    if not exists(select 1 from public.pairs where invite_code=code) then return code; end if;
  end loop;
  raise exception 'Не удалось создать код приглашения';
end;
$$;

create or replace function public.app_get()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := coalesce(auth.jwt()->>'email','');
  v_name text := coalesce(nullif(auth.jwt()->'user_metadata'->>'name',''), split_part(coalesce(auth.jwt()->>'email','пользователь'),'@',1));
  v_member public.members%rowtype;
  v_pair public.pairs%rowtype;
begin
  if v_uid is null then raise exception 'Нужно войти в аккаунт'; end if;

  select * into v_member from public.members where user_id=v_uid limit 1;
  if not found then
    return jsonb_build_object('user',jsonb_build_object('id',v_uid,'email',v_email,'name',v_name),'onboarding',true);
  end if;

  select * into v_pair from public.pairs where id=v_member.pair_id;
  if not found then raise exception 'Пространство пары не найдено'; end if;

  if v_member.status='pending' then
    return jsonb_build_object(
      'user',jsonb_build_object('id',v_uid,'email',v_email,'name',v_name),
      'onboarding',false,'waiting',true,'pair',to_jsonb(v_pair),'members',jsonb_build_array(to_jsonb(v_member))
    );
  end if;

  delete from public.secret_messages
  where pair_id=v_pair.id
    and expires_at is not null
    and expires_at <> ''
    and expires_at <> 'after_view'
    and expires_at ~ '^\\d{4}-\\d{2}-\\d{2}T'
    and expires_at::timestamptz < now();

  return jsonb_build_object(
    'user',jsonb_build_object('id',v_uid,'email',v_email,'name',v_name),
    'onboarding',false,
    'pair',to_jsonb(v_pair),
    'members',(select coalesce(jsonb_agg(to_jsonb(x) order by x.joined_at),'[]'::jsonb) from public.members x where x.pair_id=v_pair.id),
    'events',(select coalesce(jsonb_agg(to_jsonb(x) order by x.event_date,x.event_time),'[]'::jsonb) from public.events x where x.pair_id=v_pair.id),
    'notes',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) from public.notes x where x.pair_id=v_pair.id),
    'messages',(select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at,q.id),'[]'::jsonb) from (select * from public.messages x where x.pair_id=v_pair.id order by x.created_at desc,x.id desc limit 100) q),
    'wishes',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) from public.wishes x where x.pair_id=v_pair.id),
    'invitations',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) from public.invitations x where x.pair_id=v_pair.id),
    'aliases',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.partner_aliases x where x.pair_id=v_pair.id),
    'secret_messages',(select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at),'[]'::jsonb) from (select * from public.secret_messages x where x.pair_id=v_pair.id order by x.created_at asc limit 100) q)
  );
end;
$$;

create or replace function public.app_action(p_action text, p_payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := coalesce(auth.jwt()->>'email','');
  v_auth_name text := coalesce(nullif(auth.jwt()->'user_metadata'->>'name',''), split_part(coalesce(auth.jwt()->>'email','пользователь'),'@',1));
  v_member public.members%rowtype;
  v_pair public.pairs%rowtype;
  v_event public.events%rowtype;
  v_wish public.wishes%rowtype;
  v_invite public.invitations%rowtype;
  v_secret public.secret_messages%rowtype;
  v_id uuid;
  v_target uuid;
  v_text text;
  v_status text;
  v_count int;
  v_bool boolean;
begin
  if v_uid is null then raise exception 'Нужно войти в аккаунт'; end if;
  p_action := public.mn_clean(p_action,40);

  if p_action='createPair' then
    if exists(select 1 from public.members where user_id=v_uid) then raise exception 'Вы уже состоите в паре'; end if;
    v_id := gen_random_uuid();
    insert into public.pairs(id,name,invite_code,theme)
    values(v_id, coalesce(nullif(public.mn_clean(p_payload->>'name',60),''),'Между нами'), public.mn_invite_code(),
      case when public.mn_clean(p_payload->>'theme',20) in ('rose','night','ocean','sunset') then public.mn_clean(p_payload->>'theme',20) else 'rose' end);
    insert into public.members(pair_id,user_id,display_name,email,role,status,bio,birth_date)
    values(v_id,v_uid,coalesce(nullif(public.mn_clean(p_payload->>'displayName',60),''),v_auth_name),v_email,'owner','active',public.mn_clean(p_payload->>'bio',160),public.mn_clean(p_payload->>'birthDate',10));
    return jsonb_build_object('ok',true);
  end if;

  if p_action='joinPair' then
    if exists(select 1 from public.members where user_id=v_uid) then raise exception 'Вы уже состоите в паре'; end if;
    select * into v_pair from public.pairs where invite_code=upper(public.mn_clean(p_payload->>'inviteCode',10));
    if not found then raise exception 'Такой код не найден'; end if;
    select count(*) into v_count from public.members where pair_id=v_pair.id;
    if v_count>=2 then raise exception 'В этом пространстве уже два участника'; end if;
    insert into public.members(pair_id,user_id,display_name,email,role,status,bio,birth_date)
    values(v_pair.id,v_uid,coalesce(nullif(public.mn_clean(p_payload->>'displayName',60),''),v_auth_name),v_email,'partner','pending',public.mn_clean(p_payload->>'bio',160),public.mn_clean(p_payload->>'birthDate',10));
    return jsonb_build_object('ok',true);
  end if;

  select * into v_member from public.members where user_id=v_uid limit 1;
  if not found then raise exception 'Сначала создайте пространство пары'; end if;
  if v_member.status<>'active' then raise exception 'Партнёр ещё не подтвердил запрос'; end if;

  if p_action='confirmPartner' then
    if v_member.role<>'owner' then raise exception 'Только создатель пары может подтвердить запрос'; end if;
    begin v_target := (p_payload->>'userId')::uuid; exception when others then raise exception 'Неверный пользователь'; end;
    update public.members set status='active' where pair_id=v_member.pair_id and user_id=v_target and status='pending';
    if not found then raise exception 'Запрос партнёра не найден'; end if;
    return jsonb_build_object('ok',true);
  end if;

  if p_action='updateProfile' then
    update public.members set
      display_name=coalesce(nullif(public.mn_clean(p_payload->>'displayName',60),''),display_name),
      bio=public.mn_clean(p_payload->>'bio',160), birth_date=public.mn_clean(p_payload->>'birthDate',10)
    where id=v_member.id;
    return jsonb_build_object('ok',true);
  end if;

  if p_action='setAlias' then
    begin v_target := (p_payload->>'targetUserId')::uuid; exception when others then raise exception 'Выберите партнёра'; end;
    v_text := public.mn_clean(p_payload->>'alias',60);
    if v_text='' then raise exception 'Введите прозвище'; end if;
    if not exists(select 1 from public.members where pair_id=v_member.pair_id and user_id=v_target) then raise exception 'Партнёр не найден'; end if;
    insert into public.partner_aliases(pair_id,owner_user_id,target_user_id,alias)
      values(v_member.pair_id,v_uid,v_target,v_text)
      on conflict(owner_user_id,target_user_id) do update set alias=excluded.alias;
    return jsonb_build_object('ok',true);
  end if;

  if p_action='updatePair' then
    update public.pairs set name=coalesce(nullif(public.mn_clean(p_payload->>'name',60),''),'Между нами'),
      relationship_date=public.mn_clean(p_payload->>'relationshipDate',10), accent=coalesce(nullif(public.mn_clean(p_payload->>'accent',20),''),'rose')
    where id=v_member.pair_id;
    return jsonb_build_object('ok',true);
  end if;

  if p_action in ('deleteEvent','cancelEvent','restoreEvent') then
    begin v_id := (p_payload->>'id')::uuid; exception when others then raise exception 'Событие не найдено'; end;
    select * into v_event from public.events where id=v_id and pair_id=v_member.pair_id;
    if not found then raise exception 'Событие не найдено'; end if;
    if p_action='deleteEvent' then delete from public.events where id=v_id;
    else update public.events set cancelled=(p_action='cancelEvent') where id=v_id; end if;
    return jsonb_build_object('ok',true);
  end if;

  if p_action='moveEvent' then
    begin v_id := (p_payload->>'id')::uuid; exception when others then raise exception 'Событие не найдено'; end;
    v_text := public.mn_clean(p_payload->>'eventDate',10);
    if v_text !~ '^\\d{4}-\\d{2}-\\d{2}$' then raise exception 'Выберите дату'; end if;
    update public.events set event_date=v_text where id=v_id and pair_id=v_member.pair_id;
    if not found then raise exception 'Событие не найдено'; end if;
    return jsonb_build_object('ok',true);
  end if;

  if p_action in ('addEvent','updateEvent') then
    v_text := public.mn_clean(p_payload->>'title',100);
    if v_text='' or public.mn_clean(p_payload->>'eventDate',10) !~ '^\\d{4}-\\d{2}-\\d{2}$' then raise exception 'Заполните название и дату'; end if;
    if p_action='updateEvent' then
      begin v_id := (p_payload->>'id')::uuid; exception when others then raise exception 'Событие не найдено'; end;
      update public.events set title=v_text,event_date=public.mn_clean(p_payload->>'eventDate',10),event_time=public.mn_clean(p_payload->>'eventTime',5),description=public.mn_clean(p_payload->>'description',1000),category=coalesce(nullif(public.mn_clean(p_payload->>'category',40),''),'general'),marker=coalesce(nullif(public.mn_clean(p_payload->>'marker',20),''),'dot'),color=coalesce(nullif(public.mn_clean(p_payload->>'color',20),''),'#E75078')
      where id=v_id and pair_id=v_member.pair_id;
      if not found then raise exception 'Событие не найдено'; end if;
    else
      v_id := gen_random_uuid();
      insert into public.events(id,pair_id,author_user_id,title,event_date,event_time,description,category,marker,color)
      values(v_id,v_member.pair_id,v_uid,v_text,public.mn_clean(p_payload->>'eventDate',10),public.mn_clean(p_payload->>'eventTime',5),public.mn_clean(p_payload->>'description',1000),coalesce(nullif(public.mn_clean(p_payload->>'category',40),''),'general'),coalesce(nullif(public.mn_clean(p_payload->>'marker',20),''),'dot'),coalesce(nullif(public.mn_clean(p_payload->>'color',20),''),'#E75078'));
    end if;
    return jsonb_build_object('ok',true,'id',v_id);
  end if;

  if p_action='addNote' then
    v_text:=public.mn_clean(p_payload->>'title',100); if v_text='' then raise exception 'Добавьте заголовок'; end if;
    insert into public.notes(pair_id,author_user_id,title,content) values(v_member.pair_id,v_uid,v_text,public.mn_clean(p_payload->>'content',3000));
    return jsonb_build_object('ok',true);
  end if;

  if p_action='deleteMessage' then
    begin v_id := (p_payload->>'id')::uuid; exception when others then raise exception 'Сообщение не найдено'; end;
    delete from public.messages where id=v_id and pair_id=v_member.pair_id and author_user_id=v_uid;
    if not found then raise exception 'Сообщение не найдено или принадлежит другому человеку'; end if;
    return jsonb_build_object('ok',true);
  end if;

  if p_action='addMessage' then
    v_text:=public.mn_clean(p_payload->>'content',1000); if v_text='' then raise exception 'Сообщение пустое'; end if;
    insert into public.messages(pair_id,author_user_id,author_name,content) values(v_member.pair_id,v_uid,v_member.display_name,v_text);
    return jsonb_build_object('ok',true);
  end if;

  if p_action='addWish' then
    v_text:=public.mn_clean(p_payload->>'title',140); if v_text='' then raise exception 'Напишите, чего вы хотите'; end if;
    v_id:=gen_random_uuid();
    insert into public.wishes(id,pair_id,author_user_id,author_name,title,details,link,price,priority)
    values(v_id,v_member.pair_id,v_uid,v_member.display_name,v_text,public.mn_clean(p_payload->>'details',1000),public.mn_clean(p_payload->>'link',600),public.mn_clean(p_payload->>'price',40),coalesce(nullif(public.mn_clean(p_payload->>'priority',20),''),'nice'));
    return jsonb_build_object('ok',true,'id',v_id);
  end if;

  if p_action='deleteWish' then
    begin v_id := (p_payload->>'id')::uuid; exception when others then raise exception 'Желание не найдено'; end;
    delete from public.wishes where id=v_id and pair_id=v_member.pair_id and author_user_id=v_uid;
    if not found then raise exception 'Удалять можно только свои желания'; end if;
    return jsonb_build_object('ok',true);
  end if;

  if p_action='fulfillWish' then
    begin v_id := (p_payload->>'id')::uuid; exception when others then raise exception 'Хотелка не найдена'; end;
    select * into v_wish from public.wishes where id=v_id and pair_id=v_member.pair_id;
    if not found then raise exception 'Хотелка не найдена'; end if;
    update public.wishes set fulfilled=not v_wish.fulfilled where id=v_id;
    return jsonb_build_object('ok',true);
  end if;

  if p_action='reserveWish' then
    begin v_id := (p_payload->>'id')::uuid; exception when others then raise exception 'Хотелка не найдена'; end;
    select * into v_wish from public.wishes where id=v_id and pair_id=v_member.pair_id;
    if not found or v_wish.author_user_id=v_uid then raise exception 'Эту хотелку нельзя забронировать'; end if;
    update public.wishes set reserved_by=case when v_wish.reserved_by=v_uid then null else v_uid end where id=v_id;
    return jsonb_build_object('ok',true);
  end if;

  if p_action='addSecretMessage' then
    if public.mn_clean(p_payload->>'cipherText',200000)='' or public.mn_clean(p_payload->>'iv',100)='' then raise exception 'Сообщение не зашифровано'; end if;
    insert into public.secret_messages(pair_id,author_user_id,author_name,cipher_text,iv,kind,media_key,expires_at)
    values(v_member.pair_id,v_uid,v_member.display_name,public.mn_clean(p_payload->>'cipherText',200000),public.mn_clean(p_payload->>'iv',100),coalesce(nullif(public.mn_clean(p_payload->>'kind',40),''),'text'),nullif(public.mn_clean(p_payload->>'mediaKey',700),''),nullif(public.mn_clean(p_payload->>'expiresAt',60),''));
    return jsonb_build_object('ok',true);
  end if;

  if p_action in ('deleteSecretMessage','consumeSecretMessage') then
    begin v_id := (p_payload->>'id')::uuid; exception when others then return jsonb_build_object('ok',true); end;
    select * into v_secret from public.secret_messages where id=v_id and pair_id=v_member.pair_id;
    if not found then return jsonb_build_object('ok',true); end if;
    if p_action='deleteSecretMessage' and v_secret.author_user_id<>v_uid then raise exception 'Удалять можно только свои сообщения'; end if;
    if p_action='consumeSecretMessage' and not (v_secret.author_user_id<>v_uid and v_secret.expires_at='after_view') then raise exception 'Сообщение нельзя удалить после просмотра'; end if;
    delete from public.secret_messages where id=v_id;
    return jsonb_build_object('ok',true);
  end if;

  if p_action='addInvitation' then
    v_text:=coalesce(nullif(public.mn_clean(p_payload->>'title',100),''),'Приглашение на свидание');
    if public.mn_clean(p_payload->>'letter',2000)='' or public.mn_clean(p_payload->>'eventDate',10) !~ '^\\d{4}-\\d{2}-\\d{2}$' then raise exception 'Заполните текст и дату'; end if;
    insert into public.invitations(pair_id,author_user_id,author_name,title,letter,event_date,event_time,place)
    values(v_member.pair_id,v_uid,v_member.display_name,v_text,public.mn_clean(p_payload->>'letter',2000),public.mn_clean(p_payload->>'eventDate',10),public.mn_clean(p_payload->>'eventTime',5),public.mn_clean(p_payload->>'place',200));
    return jsonb_build_object('ok',true);
  end if;

  if p_action='respondInvitation' then
    begin v_id := (p_payload->>'id')::uuid; exception when others then raise exception 'Приглашение не найдено'; end;
    v_status:=public.mn_clean(p_payload->>'status',20); if v_status not in ('accepted','declined') then raise exception 'Неверный ответ'; end if;
    select * into v_invite from public.invitations where id=v_id and pair_id=v_member.pair_id;
    if not found then raise exception 'Приглашение не найдено'; end if;
    update public.invitations set status=v_status where id=v_id;
    if v_status='accepted' then
      insert into public.events(pair_id,author_user_id,title,event_date,event_time,description)
      values(v_member.pair_id,v_invite.author_user_id,v_invite.title,v_invite.event_date,v_invite.event_time,case when v_invite.place<>'' then 'Место: '||v_invite.place else left(v_invite.letter,300) end);
    end if;
    return jsonb_build_object('ok',true);
  end if;

  if p_action='updateTheme' then
    v_text:=public.mn_clean(p_payload->>'theme',20); if v_text not in ('rose','night','ocean','sunset') then raise exception 'Тема не найдена'; end if;
    update public.pairs set theme=v_text where id=v_member.pair_id;
    return jsonb_build_object('ok',true);
  end if;

  if p_action='setPhoto' then
    v_text:=public.mn_clean(p_payload->>'key',700);
    if v_text='' or left(v_text,length(v_member.pair_id::text)+1)<>v_member.pair_id::text||'/' then raise exception 'Неверный путь фотографии'; end if;
    v_status:=public.mn_clean(p_payload->>'purpose',30);
    if v_status='avatar' then update public.members set avatar_key=v_text where id=v_member.id;
    elsif v_status='background' then update public.pairs set background_key=v_text where id=v_member.pair_id;
    elsif v_status='event' then
      begin v_id:=(p_payload->>'targetId')::uuid; exception when others then raise exception 'Событие не найдено'; end;
      update public.events set photo_key=v_text where id=v_id and pair_id=v_member.pair_id; if not found then raise exception 'Событие не найдено'; end if;
    elsif v_status='wish' then
      begin v_id:=(p_payload->>'targetId')::uuid; exception when others then raise exception 'Желание не найдено'; end;
      update public.wishes set photo_key=v_text where id=v_id and pair_id=v_member.pair_id and author_user_id=v_uid; if not found then raise exception 'Желание не найдено'; end if;
    elsif v_status='message' then
      insert into public.messages(pair_id,author_user_id,author_name,content,photo_key) values(v_member.pair_id,v_uid,v_member.display_name,public.mn_clean(p_payload->>'content',1000),v_text);
    else raise exception 'Неизвестный тип фотографии'; end if;
    return jsonb_build_object('ok',true);
  end if;

  raise exception 'Неизвестное действие';
end;
$$;

revoke all on function public.app_get() from public, anon;
revoke all on function public.app_action(text,jsonb) from public, anon;
grant execute on function public.app_get() to authenticated;
grant execute on function public.app_action(text,jsonb) to authenticated;
grant execute on function public.mn_user_in_pair(uuid) to authenticated;

-- Приватное хранилище фотографий. Первый сегмент пути = id пространства пары.
insert into storage.buckets(id,name,public)
values('couple-media','couple-media',false)
on conflict(id) do update set public=false;


drop policy if exists "mn media select" on storage.objects;
drop policy if exists "mn media insert" on storage.objects;
drop policy if exists "mn media update" on storage.objects;
drop policy if exists "mn media delete" on storage.objects;

create policy "mn media select" on storage.objects for select to authenticated
using (
  bucket_id='couple-media'
  and array_length(storage.foldername(name),1)>=1
  and public.mn_user_in_pair(((storage.foldername(name))[1])::uuid)
);
create policy "mn media insert" on storage.objects for insert to authenticated
with check (
  bucket_id='couple-media'
  and array_length(storage.foldername(name),1)>=1
  and public.mn_user_in_pair(((storage.foldername(name))[1])::uuid)
);
create policy "mn media update" on storage.objects for update to authenticated
using (bucket_id='couple-media' and public.mn_user_in_pair(((storage.foldername(name))[1])::uuid))
with check (bucket_id='couple-media' and public.mn_user_in_pair(((storage.foldername(name))[1])::uuid));
create policy "mn media delete" on storage.objects for delete to authenticated
using (bucket_id='couple-media' and public.mn_user_in_pair(((storage.foldername(name))[1])::uuid));

-- Готово. Дальше нужны только Project URL и Publishable key в docs/config.js.
