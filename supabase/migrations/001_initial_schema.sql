-- Users table (mirrors Supabase Auth, stores HD-specific data)
create table if not exists users (
  id uuid references auth.users(id) primary key,
  email text not null unique,
  created_at timestamptz default now()
);

-- Orders table
create table if not exists orders (
  id text primary key,              -- orderId from Stripe metadata (UUID)
  user_id uuid references users(id),
  stripe_session_id text not null,
  amount_cents integer not null,
  currency text not null default 'usd',
  status text not null default 'pending',  -- pending | complete | failed
  created_at timestamptz default now()
);

-- HD Profiles table
create table if not exists hd_profiles (
  id uuid primary key default gen_random_uuid(),
  order_id text references orders(id) not null,
  user_id uuid references users(id) not null,
  birth_date text not null,
  birth_time text not null,
  latitude numeric not null,
  longitude numeric not null,
  timezone text not null,
  profile_json jsonb not null,      -- Full HDProfile object
  created_at timestamptz default now()
);

-- Row Level Security
alter table users enable row level security;
alter table orders enable row level security;
alter table hd_profiles enable row level security;

-- Users can read their own data only
create policy "users_select_own" on users
  for select using (auth.uid() = id);

create policy "orders_select_own" on orders
  for select using (auth.uid() = user_id);

create policy "profiles_select_own" on hd_profiles
  for select using (auth.uid() = user_id);
