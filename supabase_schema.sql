-- Schéma LMNE 2026 — à exécuter dans Supabase (SQL Editor)

create table if not exists users (
  id text primary key,
  username text not null unique,
  role text not null default 'operator',
  created_at timestamptz not null default now()
);

create table if not exists contacts (
  id text primary key,
  nom text not null,
  prenom text not null,
  telephone text not null,
  statut text not null default 'À appeler',
  statut_date timestamptz,
  statut_by text,
  call_count int not null default 0,
  last_call_date timestamptz,
  last_call_by text,
  wa_count int not null default 0,
  last_wa_date timestamptz,
  last_wa_by text,
  orig_note text,
  orig_tag text,
  orig_cat text,
  orig_flag text,
  created_at timestamptz not null default now()
);

create table if not exists events (
  id bigserial primary key,
  contact_id text not null,
  type text not null,
  username text,
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists idx_events_contact on events(contact_id);
