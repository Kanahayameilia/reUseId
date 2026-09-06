-- =========================================================
-- Jalankan seluruh file ini SEKALI di Supabase Dashboard:
-- Project kamu -> SQL Editor -> New query -> paste semua -> Run
-- =========================================================

create extension if not exists pgcrypto;

-- ---------- tabel barang ----------
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kategori text not null check (kategori in ('Pakaian','Buku','Elektronik','Perabot')),
  jenis text not null check (jenis in ('Barter','Donasi')),
  kondisi text not null check (kondisi in ('Layak','Baik','Sangat Baik')),
  lokasi text,
  jarak numeric default 0,
  description text,
  tags text[] default '{}',
  photos text[] default '{}',
  photo text,
  owner text,
  avatar text,
  rating numeric default 5,
  member_since text,
  status text not null default 'Aktif' check (status in ('Aktif','Nonaktif')),
  created_at timestamptz not null default now()
);

alter table public.items enable row level security;

drop policy if exists "Item aktif bisa dilihat siapa saja" on public.items;
create policy "Item aktif bisa dilihat siapa saja"
  on public.items for select
  using ( status = 'Aktif' or auth.uid() = user_id );

drop policy if exists "User bisa upload barang miliknya sendiri" on public.items;
create policy "User bisa upload barang miliknya sendiri"
  on public.items for insert
  with check ( auth.uid() = user_id );

drop policy if exists "User bisa update barang miliknya sendiri" on public.items;
create policy "User bisa update barang miliknya sendiri"
  on public.items for update
  using ( auth.uid() = user_id );

drop policy if exists "User bisa hapus barang miliknya sendiri" on public.items;
create policy "User bisa hapus barang miliknya sendiri"
  on public.items for delete
  using ( auth.uid() = user_id );

-- ---------- storage bucket buat foto barang ----------
insert into storage.buckets (id, name, public)
values ('items', 'items', true)
on conflict (id) do nothing;

drop policy if exists "Foto barang bisa dilihat siapa saja" on storage.objects;
create policy "Foto barang bisa dilihat siapa saja"
  on storage.objects for select
  using ( bucket_id = 'items' );

drop policy if exists "User bisa upload foto ke folder miliknya sendiri" on storage.objects;
create policy "User bisa upload foto ke folder miliknya sendiri"
  on storage.objects for insert
  with check ( bucket_id = 'items' and auth.uid()::text = (storage.foldername(name))[1] );

drop policy if exists "User bisa hapus foto miliknya sendiri" on storage.objects;
create policy "User bisa hapus foto miliknya sendiri"
  on storage.objects for delete
  using ( bucket_id = 'items' and auth.uid()::text = (storage.foldername(name))[1] );
