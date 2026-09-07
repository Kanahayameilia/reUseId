-- =========================================================
-- TABEL CONVERSATIONS
-- =========================================================

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),

  item_id bigint not null
    references public.items(id)
    on delete cascade,

  user_id uuid
    references auth.users(id)
    on delete cascade,

  buyer_id uuid
    references auth.users(id)
    on delete cascade,

  buyer_name text,
  buyer_avatar text,

  seller_id uuid
    references auth.users(id)
    on delete cascade,

  seller_name text,
  seller_avatar text,

  item_name text,
  item_photo text,

  last_message text,
  last_message_at timestamptz,

  created_at timestamptz not null default now()
);

alter table public.conversations enable row level security;


-- =========================================================
-- POLICY CONVERSATIONS
-- =========================================================

drop policy if exists "User bisa melihat conversations"
on public.conversations;

create policy "User bisa melihat conversations"
on public.conversations
for select
using (
  auth.uid() = buyer_id
  or auth.uid() = seller_id
);


drop policy if exists "User bisa membuat conversations"
on public.conversations;

create policy "User bisa membuat conversations"
on public.conversations
for insert
with check (
  auth.uid() = buyer_id
);


drop policy if exists "User bisa update conversations"
on public.conversations;

create policy "User bisa update conversations"
on public.conversations
for update
using (
  auth.uid() = buyer_id
  or auth.uid() = seller_id
)
with check (
  auth.uid() = buyer_id
  or auth.uid() = seller_id
);


drop policy if exists "User bisa menghapus conversations"
on public.conversations;

create policy "User bisa menghapus conversations"
on public.conversations
for delete
using (
  auth.uid() = buyer_id
  or auth.uid() = seller_id
);


-- =========================================================
-- TABEL MESSAGES
-- =========================================================

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),

  conversation_id uuid not null
    references public.conversations(id)
    on delete cascade,

  sender_id uuid not null
    references auth.users(id)
    on delete cascade,

  content text not null,

  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;


-- =========================================================
-- POLICY MESSAGES
-- =========================================================

drop policy if exists "User bisa melihat messages"
on public.messages;

create policy "User bisa melihat messages"
on public.messages
for select
using (
  exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and (
        c.buyer_id = auth.uid()
        or c.seller_id = auth.uid()
      )
  )
);


drop policy if exists "User bisa mengirim messages"
on public.messages;

create policy "User bisa mengirim messages"
on public.messages
for insert
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and (
        c.buyer_id = auth.uid()
        or c.seller_id = auth.uid()
      )
  )
);