-- Module 4 generated assets are retryable writes and require durable deduplication.

alter table counselor.generated_assets
  add column idempotency_key uuid;

update counselor.generated_assets
set idempotency_key = id
where idempotency_key is null;

alter table counselor.generated_assets
  alter column idempotency_key set not null,
  add constraint generated_assets_user_idempotency_key_key
    unique (user_id, idempotency_key);

comment on column counselor.generated_assets.idempotency_key is
  'Required; unique with user for retryable asset generation';
