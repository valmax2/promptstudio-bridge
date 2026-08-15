-- Segnapunti — Community (amici, avatar, eventi/partite con conferma disponibilità)
-- Da eseguire in Supabase: Dashboard → SQL Editor → incolla ed esegui.
-- Richiede Supabase Auth già attivo (di default lo è su ogni progetto nuovo).

create extension if not exists pgcrypto;

-- ============================================================
-- 1) TABELLE
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 20),
  display_name text not null,
  avatar_url text,
  avatar_color text not null default 'indigo',
  created_at timestamptz not null default now()
);

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint no_self_friendship check (requester_id <> addressee_id),
  constraint unique_pair unique (requester_id, addressee_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Partita',
  mode text not null default 'tennis' check (mode in ('tennis', 'free')),
  event_date date not null,
  event_time time,
  location text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.event_invites (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'yes', 'no')),
  responded_at timestamptz,
  constraint unique_invite unique (event_id, user_id)
);

-- ============================================================
-- 2) ROW LEVEL SECURITY — abilitazione
-- ============================================================
alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.events enable row level security;
alter table public.event_invites enable row level security;

-- ============================================================
-- 3) POLICY — profiles
-- ============================================================
create policy "profiles: lettura pubblica agli utenti loggati"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles: crea solo il proprio profilo"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles: modifica solo il proprio profilo"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

-- ============================================================
-- 4) POLICY — friendships
-- ============================================================
create policy "friendships: vedo solo le mie"
  on public.friendships for select
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "friendships: invio richieste solo a mio nome"
  on public.friendships for insert
  to authenticated
  with check (auth.uid() = requester_id);

create policy "friendships: rispondo/annullo solo le mie"
  on public.friendships for update
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "friendships: elimino solo le mie"
  on public.friendships for delete
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- ============================================================
-- 5) Funzione helper "security definer" — evita la ricorsione infinita
-- che si creerebbe se le policy di events ed event_invites si
-- interrogassero a vicenda direttamente (errore classico di RLS).
-- ============================================================
create function public.is_event_creator(_event_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.events where id = _event_id and creator_id = auth.uid()
  );
$$;

-- ============================================================
-- 6) POLICY — events
-- ============================================================
create policy "events: vedo le mie o quelle a cui sono invitato"
  on public.events for select
  to authenticated
  using (
    creator_id = auth.uid()
    or id in (select event_id from public.event_invites where user_id = auth.uid())
  );

create policy "events: creo solo a mio nome"
  on public.events for insert
  to authenticated
  with check (creator_id = auth.uid());

create policy "events: modifico solo le mie"
  on public.events for update
  to authenticated
  using (creator_id = auth.uid());

create policy "events: elimino solo le mie"
  on public.events for delete
  to authenticated
  using (creator_id = auth.uid());

-- ============================================================
-- 7) POLICY — event_invites (usa is_event_creator per evitare il ciclo)
-- ============================================================
create policy "event_invites: vedo i miei inviti o quelli dei miei eventi"
  on public.event_invites for select
  to authenticated
  using (user_id = auth.uid() or public.is_event_creator(event_id));

create policy "event_invites: solo chi crea l'evento invita"
  on public.event_invites for insert
  to authenticated
  with check (public.is_event_creator(event_id));

create policy "event_invites: rispondo solo ai miei inviti"
  on public.event_invites for update
  to authenticated
  using (user_id = auth.uid());

create policy "event_invites: elimino i miei o quelli dei miei eventi"
  on public.event_invites for delete
  to authenticated
  using (user_id = auth.uid() or public.is_event_creator(event_id));

-- ============================================================
-- 8) Crea automaticamente un profilo alla registrazione
-- (l'utente completa/cambia username, nome e colore al primo accesso in app)
-- ============================================================
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (new.id, 'utente_' || substr(new.id::text, 1, 8), coalesce(new.raw_user_meta_data->>'display_name', 'Nuovo giocatore'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
