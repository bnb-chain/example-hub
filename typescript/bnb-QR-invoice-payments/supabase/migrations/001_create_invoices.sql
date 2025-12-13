create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  merchant text not null,
  amount text not null,
  memo text,
  processor text not null,
  token text not null,
  chain_id text not null default '97',
  invoice_id text not null,
  nonce text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  tx_hash text,
  payer text,
  constraint invoices_invoice_id_unique unique (invoice_id)
);

create index if not exists invoices_merchant_idx on public.invoices (merchant);
create index if not exists invoices_status_idx on public.invoices (status);
