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
  latitude numeric,
  longitude numeric,
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

-- ---------- migrasi kolom (aman dijalankan ulang) ----------
-- Kalau tabel "items" kamu sudah ada dari sebelumnya dengan kolom yang lebih
-- sedikit, "create table if not exists" di atas TIDAK menambah kolom baru.
-- Baris-baris di bawah ini memastikan semua kolom yang dipakai fitur upload
-- beneran ada, tanpa mengubah data yang sudah tersimpan.
alter table public.items add column if not exists kategori text;
alter table public.items add column if not exists jenis text;
alter table public.items add column if not exists kondisi text;
alter table public.items add column if not exists lokasi text;
alter table public.items add column if not exists jarak numeric default 0;
alter table public.items add column if not exists latitude numeric;
alter table public.items add column if not exists longitude numeric;
alter table public.items add column if not exists description text;
alter table public.items add column if not exists tags text[] default '{}';
alter table public.items add column if not exists photos text[] default '{}';
alter table public.items add column if not exists photo text;
alter table public.items add column if not exists owner text;
alter table public.items add column if not exists avatar text;
alter table public.items add column if not exists rating numeric default 5;
alter table public.items add column if not exists member_since text;
alter table public.items add column if not exists status text default 'Aktif';
alter table public.items add column if not exists created_at timestamptz default now();

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
-- "on conflict ... do update" dipakai (bukan "do nothing") supaya kalau bucket
-- "items" udah kebuat manual lewat Dashboard tapi belum public/belum ada limit,
-- baris ini otomatis membetulkannya juga saat di-run ulang.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('items', 'items', true, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/png','image/jpeg','image/webp'];

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

-- ---------- verifikasi ----------
-- Setelah "Run", cek hasil query ini di tab "Results" paling bawah.
-- Harus muncul 1 baris: items | items | true | 5242880
-- Kalau hasilnya kosong, berarti bucket GAGAL kebuat (lihat pesan error di atas
-- tab Results) — biasanya karena role yang jalanin query nggak punya akses ke
-- schema storage; kalau itu terjadi, bikin bucket-nya manual lewat menu
-- Storage -> New bucket -> nama "items" -> aktifkan "Public bucket".
select id, name, public, file_size_limit from storage.buckets where id = 'items';