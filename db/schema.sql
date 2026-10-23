-- =====================================================================
-- BombWar — banco de dados no Supabase (Postgres)
-- Como usar: no painel do Supabase, abra "SQL Editor", cole este arquivo inteiro e clique em "Run".
-- Depois: Authentication > Providers > ative Google e E-mail; Authentication > Settings > ative "Anonymous sign-ins" (convidados).
-- Regra de ouro: o jogo do jogador só altera apelido/visual/arma/equipamento. Ouro, gemas, itens e estatísticas
-- só mudam por funções do banco (compra) ou pelo servidor do jogo (resultado das partidas, com a chave service_role).
-- =====================================================================

-- ---------- tabelas ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  pid         text unique not null default lpad((floor(random()*90000000)+10000000)::bigint::text, 8, '0'), -- ID público de 8 números
  nick        text not null check (nick ~ '^[A-Za-z0-9_À-ú]{3,14}$'),
  look        text not null default 'sol' check (look in ('sol','exp','mec','avi')),
  eq          jsonb not null default '{"hat":null,"face":null,"body":null,"back":null,"feet":null}',
  weapon      text not null default 'war',
  guest       boolean not null default false,
  gold        int not null default 1000  check (gold >= 0),
  gems        int not null default 10000 check (gems >= 0),   -- valor inicial desta versão de testes
  wins        int not null default 0,
  losses      int not null default 0,
  shots       int not null default 0,
  hits        int not null default 0,
  games       int not null default 0,
  rp          int not null default 100 check (rp >= 0),          -- pontos de ranking (RP)
  created_at  timestamptz not null default now()
);
create unique index if not exists profiles_nick_lower on public.profiles (lower(nick));
-- banco criado antes do ranking por RP: cria a coluna
alter table public.profiles add column if not exists rp int not null default 100;
create index if not exists profiles_rp on public.profiles (rp desc) where not guest;

create table if not exists public.items (
  id          text primary key,
  slot        text not null check (slot in ('hat','face','body','back','feet','vwar','vsni','vmag','vart','vbal')), -- v* = skin de veículo
  name        text not null,
  rarity      text not null check (rarity in ('c','r','e','l')),
  price_gold  int,
  price_gems  int
);

-- banco criado antes dos veículos: troca a regra antiga do slot pela nova
alter table public.items drop constraint if exists items_slot_check;
alter table public.items add constraint items_slot_check check (slot in ('hat','face','body','back','feet','vwar','vsni','vmag','vart','vbal'));

create table if not exists public.inventory (
  user_id   uuid not null references public.profiles(id) on delete cascade,
  item_id   text not null references public.items(id),
  bought_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table if not exists public.friendships (      -- guardada nos dois sentidos (a,b) e (b,a)
  a uuid not null references public.profiles(id) on delete cascade,
  b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (a, b), check (a <> b)
);

create table if not exists public.friend_requests (
  from_id uuid not null references public.profiles(id) on delete cascade,
  to_id   uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_id, to_id), check (from_id <> to_id)
);

create table if not exists public.matches (            -- gravado pelo servidor do jogo
  id         bigint generated always as identity primary key,
  seed       bigint not null,
  map        text, tod text, fmt text,
  winner     int,                                      -- 0 Azul, 1 Rosa, -1 empate
  created_at timestamptz not null default now()
);
create table if not exists public.match_players (
  match_id bigint not null references public.matches(id) on delete cascade,
  user_id  uuid references public.profiles(id) on delete set null,
  team int, weapon text, dmg int, shots int, hits int, gold int,
  primary key (match_id, user_id)
);

create table if not exists public.wallet_log (         -- histórico de cada moeda ganha ou gasta
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  gold int not null default 0, gems int not null default 0,
  reason text not null, created_at timestamptz not null default now()
);

-- perfil público (o que qualquer jogador pode ver de outro)
create or replace view public.public_profiles as
  select id as uid, pid, nick, look, eq, weapon, wins, losses, shots, hits, games, rp from public.profiles where not guest;

-- ---------- permissões e travas (RLS) ----------
alter table public.profiles        enable row level security;
alter table public.items           enable row level security;
alter table public.inventory       enable row level security;
alter table public.friendships     enable row level security;
alter table public.friend_requests enable row level security;
alter table public.matches         enable row level security;
alter table public.match_players   enable row level security;
alter table public.wallet_log      enable row level security;

drop policy if exists "perfil: ler o próprio" on public.profiles;
create policy "perfil: ler o próprio" on public.profiles for select using (auth.uid() = id);
drop policy if exists "perfil: criar o próprio" on public.profiles;
create policy "perfil: criar o próprio" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "perfil: alterar o próprio" on public.profiles;
create policy "perfil: alterar o próprio" on public.profiles for update using (auth.uid() = id);
-- o jogador só escreve estas colunas; o resto (ouro, gemas, estatísticas) fica travado
revoke insert, update on public.profiles from anon, authenticated;
grant insert (id, nick, look, weapon, guest) on public.profiles to authenticated;
grant update (look, eq, weapon) on public.profiles to authenticated;

drop policy if exists "itens: todos leem" on public.items;
create policy "itens: todos leem" on public.items for select using (true);
drop policy if exists "inventário: ler o próprio" on public.inventory;
create policy "inventário: ler o próprio" on public.inventory for select using (auth.uid() = user_id);
drop policy if exists "amizades: ver as minhas" on public.friendships;
create policy "amizades: ver as minhas" on public.friendships for select using (auth.uid() = a);
drop policy if exists "pedidos: ver os meus" on public.friend_requests;
create policy "pedidos: ver os meus" on public.friend_requests for select using (auth.uid() in (from_id, to_id));
drop policy if exists "carteira: ver a minha" on public.wallet_log;
create policy "carteira: ver a minha" on public.wallet_log for select using (auth.uid() = user_id);
grant select on public.public_profiles to anon, authenticated;

-- só deixa equipar itens que o jogador tem
create or replace function public.check_eq() returns trigger language plpgsql security definer set search_path = public as $$
declare k text; v text;
begin
  for k, v in select key, value #>> '{}' from jsonb_each(new.eq) loop
    if k not in ('hat','face','body','back','feet','vwar','vsni','vmag','vart','vbal') then raise exception 'espaço inválido: %', k; end if;
    if v is not null and not exists (select 1 from inventory i join items it on it.id = i.item_id
                                     where i.user_id = new.id and i.item_id = v and it.slot = k) then
      raise exception 'item % não está no armazém', v;
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists profiles_check_eq on public.profiles;
create trigger profiles_check_eq before update of eq on public.profiles for each row execute function public.check_eq();

-- ---------- funções chamadas pelo jogo ----------
create or replace function public.nick_available(p_nick text) returns boolean language sql security definer set search_path = public as $$
  select not exists (select 1 from profiles where lower(nick) = lower(p_nick) and id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid));
$$;

create or replace function public.buy_item(p_item text) returns json language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); it items; pr profiles;
begin
  if me is null then raise exception 'faça login'; end if;
  select * into pr from profiles where id = me for update;
  if pr.guest then raise exception 'Crie uma conta para comprar.'; end if;
  select * into it from items where id = p_item;
  if not found then raise exception 'Item não existe.'; end if;
  if exists (select 1 from inventory where user_id = me and item_id = p_item) then raise exception 'Você já tem esse item.'; end if;
  if it.price_gems is not null then
    if pr.gems < it.price_gems then raise exception 'Gemas insuficientes.'; end if;
    update profiles set gems = gems - it.price_gems where id = me;
    insert into wallet_log(user_id, gems, reason) values (me, -it.price_gems, 'compra ' || p_item);
  else
    if pr.gold < it.price_gold then raise exception 'Ouro insuficiente.'; end if;
    update profiles set gold = gold - it.price_gold where id = me;
    insert into wallet_log(user_id, gold, reason) values (me, -it.price_gold, 'compra ' || p_item);
  end if;
  insert into inventory(user_id, item_id) values (me, p_item);
  select * into pr from profiles where id = me;
  return json_build_object('gold', pr.gold, 'gems', pr.gems);
end $$;

drop function if exists public.my_friends();
create or replace function public.my_friends() returns table (uid uuid, pid text, nick text, look text, eq jsonb, weapon text,
  wins int, losses int, shots int, hits int, games int, rp int, rel text) language sql security definer set search_path = public as $$
  select p.id, p.pid, p.nick, p.look, p.eq, p.weapon, p.wins, p.losses, p.shots, p.hits, p.games, p.rp, 'friend' from friendships f join profiles p on p.id = f.b where f.a = auth.uid()
  union all
  select p.id, p.pid, p.nick, p.look, p.eq, p.weapon, p.wins, p.losses, p.shots, p.hits, p.games, p.rp, 'in' from friend_requests r join profiles p on p.id = r.from_id where r.to_id = auth.uid()
  union all
  select p.id, p.pid, p.nick, p.look, p.eq, p.weapon, p.wins, p.losses, p.shots, p.hits, p.games, p.rp, 'out' from friend_requests r join profiles p on p.id = r.to_id where r.from_id = auth.uid();
$$;

create or replace function public.friend_request(p_to uuid) returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null or p_to = me then raise exception 'pedido inválido'; end if;
  if exists (select 1 from profiles where id = me and guest) then raise exception 'Crie uma conta para adicionar amigos.'; end if;
  if exists (select 1 from friendships where a = me and b = p_to) then raise exception 'Vocês já são amigos.'; end if;
  if exists (select 1 from friend_requests where from_id = p_to and to_id = me) then   -- a outra pessoa já tinha pedido
    delete from friend_requests where from_id = p_to and to_id = me;
    insert into friendships(a, b) values (me, p_to), (p_to, me) on conflict do nothing;
  else
    insert into friend_requests(from_id, to_id) values (me, p_to) on conflict do nothing;
  end if;
end $$;

create or replace function public.friend_respond(p_from uuid, p_ok boolean) returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  delete from friend_requests where from_id = p_from and to_id = me;
  if not found then raise exception 'Pedido não encontrado.'; end if;
  if p_ok then insert into friendships(a, b) values (me, p_from), (p_from, me) on conflict do nothing; end if;
end $$;

create or replace function public.friend_remove(p_uid uuid) returns void language sql security definer set search_path = public as $$
  delete from friendships where (a = auth.uid() and b = p_uid) or (a = p_uid and b = auth.uid());
$$;

-- resultado de partida: só o servidor do jogo (chave secreta / service_role) pode chamar.
-- p_ranked = partida só com jogadores (sem bots): conta vitória, derrota, precisão e estatísticas.
-- Partida com bots (p_ranked = false): só dá o ouro, sem mexer nas estatísticas.
-- p_rp = pontos de ranking da partida (calculados pelo servidor: vitória pelo formato, abates, suicídio); vale nas duas. Devolve o RP novo.
drop function if exists public.record_result(uuid, boolean, int, int, int);
drop function if exists public.record_result(uuid, boolean, int, int, int, boolean);
create or replace function public.record_result(p_user uuid, p_win boolean, p_shots int, p_hits int, p_gold int, p_ranked boolean default true, p_rp int default 0) returns int
language plpgsql security definer set search_path = public as $$
declare v int;
begin
  if p_ranked then
    update profiles set games = games + 1, wins = wins + (case when p_win then 1 else 0 end), losses = losses + (case when p_win then 0 else 1 end),
           shots = shots + p_shots, hits = hits + p_hits, gold = gold + p_gold where id = p_user;
  else
    update profiles set gold = gold + p_gold where id = p_user;
  end if;
  update profiles set rp = greatest(0, rp + coalesce(p_rp, 0)) where id = p_user returning rp into v;
  insert into wallet_log(user_id, gold, reason) values (p_user, p_gold, case when not p_ranked then 'partida com bots' when p_win then 'vitória' else 'derrota' end);
  return v;
end $$;
revoke execute on function public.record_result(uuid, boolean, int, int, int, boolean, int) from public, anon, authenticated;
grant execute on function public.record_result(uuid, boolean, int, int, int, boolean, int) to service_role;

-- posição no ranking (para as patentes Águia = 30% melhores e Mestre = 3 primeiros). Convidados não entram.
create or replace function public.rank_info(p_uids uuid[]) returns table (uid uuid, rp int, pos int, total int)
language sql stable security definer set search_path = public as $$
  select p.id, p.rp,
    (select count(*)::int + 1 from profiles q where not q.guest and q.rp > p.rp),
    (select count(*)::int from profiles where not guest)
  from profiles p where p.id = any(p_uids) and not p.guest;
$$;
grant execute on function public.rank_info(uuid[]) to anon, authenticated;

grant execute on function public.nick_available(text), public.buy_item(text), public.my_friends(),
  public.friend_request(uuid), public.friend_respond(uuid, boolean), public.friend_remove(uuid) to authenticated;
grant execute on function public.nick_available(text) to anon;

-- ---------- catálogo de skins (gerado a partir do jogo) ----------
insert into public.items (id, slot, name, rarity, price_gold, price_gems) values
  ('h_cap', 'hat', 'Boné Vermelho', 'c', 300, null),
  ('h_beanie', 'hat', 'Gorro de Lã', 'c', 350, null),
  ('h_chef', 'hat', 'Chapéu de Chef', 'c', 500, null),
  ('h_cowboy', 'hat', 'Chapéu de Caubói', 'r', 1200, null),
  ('h_top', 'hat', 'Cartola', 'r', 1500, null),
  ('h_viking', 'hat', 'Elmo Viking', 'r', 2000, null),
  ('h_pirate', 'hat', 'Chapéu Pirata', 'e', null, 450),
  ('h_wizard', 'hat', 'Chapéu de Mago', 'e', null, 600),
  ('h_crown', 'hat', 'Coroa Real', 'l', null, 1800),
  ('h_halo', 'hat', 'Auréola', 'l', null, 2200),
  ('f_sun', 'face', 'Óculos Escuros', 'c', 300, null),
  ('f_round', 'face', 'Óculos Redondos', 'c', 350, null),
  ('f_mous', 'face', 'Bigode Charmoso', 'c', 400, null),
  ('f_patch', 'face', 'Tapa-Olho', 'r', 1200, null),
  ('f_beard', 'face', 'Barba de Lenhador', 'r', 1400, null),
  ('f_clown', 'face', 'Nariz de Palhaço', 'r', 1000, null),
  ('f_mono', 'face', 'Monóculo', 'e', null, 400),
  ('f_ninja', 'face', 'Máscara Ninja', 'e', null, 500),
  ('f_star', 'face', 'Óculos Estrela', 'e', null, 600),
  ('f_cyber', 'face', 'Visor Cibernético', 'l', null, 1600),
  ('b_hoodie', 'body', 'Moletom', 'c', 400, null),
  ('b_hawaii', 'body', 'Camisa Havaiana', 'c', 450, null),
  ('b_jersey', 'body', 'Camisa de Futebol', 'c', 500, null),
  ('b_lab', 'body', 'Jaleco', 'r', 1200, null),
  ('b_leather', 'body', 'Jaqueta de Couro', 'r', 1500, null),
  ('b_tux', 'body', 'Smoking', 'r', 2000, null),
  ('b_ninja', 'body', 'Traje Ninja', 'e', null, 500),
  ('b_astro', 'body', 'Traje Espacial', 'e', null, 700),
  ('b_armor', 'body', 'Armadura de Cavaleiro', 'e', null, 800),
  ('b_royal', 'body', 'Manto Real', 'l', null, 2000),
  ('k_backpack', 'back', 'Mochila', 'c', 350, null),
  ('k_cape', 'back', 'Capa Vermelha', 'c', 500, null),
  ('k_quiver', 'back', 'Aljava de Flechas', 'c', 450, null),
  ('k_guitar', 'back', 'Violão', 'r', 1300, null),
  ('k_katana', 'back', 'Katana', 'r', 1600, null),
  ('k_shell', 'back', 'Casco de Tartaruga', 'r', 1800, null),
  ('k_jet', 'back', 'Jetpack', 'e', null, 700),
  ('k_bat', 'back', 'Asas de Morcego', 'e', null, 800),
  ('k_angel', 'back', 'Asas de Anjo', 'l', null, 2200),
  ('k_dragon', 'back', 'Asas de Dragão', 'l', null, 2500),
  ('s_sneak', 'feet', 'Tênis Vermelho', 'c', 300, null),
  ('s_slip', 'feet', 'Pantufas de Coelho', 'c', 350, null),
  ('s_tabi', 'feet', 'Botas Ninja', 'c', 400, null),
  ('s_cowboy', 'feet', 'Botas de Caubói', 'r', 1200, null),
  ('s_skate', 'feet', 'Patins', 'r', 1500, null),
  ('s_iron', 'feet', 'Botas de Ferro', 'r', 1700, null),
  ('s_clown', 'feet', 'Sapatos de Palhaço', 'e', null, 450),
  ('s_wing', 'feet', 'Sandálias Aladas', 'e', null, 650),
  ('s_rocket', 'feet', 'Botas-Foguete', 'l', null, 1500),
  ('s_gold', 'feet', 'Botas de Ouro', 'l', null, 1800),
  -- skins de veículo
  ('vw_desert', 'vwar', 'Tanque do Deserto', 'c', 900, null),
  ('vw_arctic', 'vwar', 'Tanque Ártico', 'r', 2200, null),
  ('vw_toy', 'vwar', 'Tanque de Corda', 'e', null, 600),
  ('vw_turtle', 'vwar', 'Tartaruga Couraçada', 'e', null, 750),
  ('vw_king', 'vwar', 'Tanque do Rei', 'l', null, 1800),
  ('vs_jungle', 'vsni', 'Jipe da Selva', 'c', 900, null),
  ('vs_night', 'vsni', 'Jipe Noturno', 'r', 2000, null),
  ('vs_rally', 'vsni', 'Jipe de Rali', 'r', 2600, null),
  ('vs_ostrich', 'vsni', 'Avestruz Corredora', 'e', null, 650),
  ('vs_spectre', 'vsni', 'Jipe Spectre', 'l', null, 2000),
  ('vm_ruby', 'vmag', 'Kart Rubi', 'c', 1000, null),
  ('vm_frost', 'vmag', 'Kart Gelo Eterno', 'r', 2200, null),
  ('vm_storm', 'vmag', 'Nuvem de Tempestade', 'r', 2600, null),
  ('vm_pumpkin', 'vmag', 'Abóbora Assombrada', 'e', null, 700),
  ('vm_dragon', 'vmag', 'Dragão Ancestral', 'l', null, 2500),
  ('va_army', 'vart', 'Carrinho Militar', 'c', 900, null),
  ('va_fire', 'vart', 'Carrinho Bombeiro', 'r', 2000, null),
  ('va_tractor', 'vart', 'Trator da Fazenda', 'r', 2400, null),
  ('va_elephant', 'vart', 'Elefante de Carga', 'e', null, 750),
  ('va_steam', 'vart', 'Engrenagem a Vapor', 'l', null, 1900),
  ('vb_gum', 'vbal', 'Monstro Chiclete', 'c', 1000, null),
  ('vb_lava', 'vbal', 'Monstro de Lava', 'r', 2300, null),
  ('vb_beach', 'vbal', 'Buggy de Praia', 'r', 2400, null),
  ('vb_frog', 'vbal', 'Sapo Saltador', 'e', null, 700),
  ('vb_galaxy', 'vbal', 'Monstro Galáctico', 'l', null, 2200)

on conflict (id) do update set slot = excluded.slot, name = excluded.name, rarity = excluded.rarity, price_gold = excluded.price_gold, price_gems = excluded.price_gems;
