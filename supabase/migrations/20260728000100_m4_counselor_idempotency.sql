-- Module 4 forward correction for durable retry handling and conversation-local turns.
-- Existing rows use their primary IDs as deterministic backfill keys.

alter table counselor.conversations
  add column start_idempotency_key uuid;

update counselor.conversations
set start_idempotency_key = id
where start_idempotency_key is null;

alter table counselor.conversations
  alter column start_idempotency_key set not null,
  add constraint conversations_user_start_idempotency_key_key
    unique (user_id, start_idempotency_key);

create unique index conversations_one_active_per_user_idx
  on counselor.conversations (user_id)
  where status = 'active';

alter table counselor.conversation_messages
  add column idempotency_key uuid,
  add column client_message_id uuid;

update counselor.conversation_messages
set idempotency_key = id
where idempotency_key is null;

alter table counselor.conversation_messages
  alter column idempotency_key set not null,
  drop constraint if exists conversation_messages_turn_number_key,
  add constraint conversation_messages_conversation_turn_key
    unique (conversation_id, turn_number),
  add constraint conversation_messages_conversation_idempotency_key
    unique (conversation_id, idempotency_key),
  add constraint conversation_messages_conversation_client_message_key
    unique (conversation_id, client_message_id);

drop index if exists counselor.conversation_messages_conversation_id_turn_number_role_idx;

alter table counselor.journey_states
  add column last_idempotency_key uuid;

alter table counselor.journey_events
  add column producer_event_id uuid;

update counselor.journey_events
set producer_event_id = id
where producer_event_id is null;

alter table counselor.journey_events
  alter column producer_event_id set not null,
  add constraint journey_events_producer_event_id_key
    unique (producer_event_id);

alter table counselor.report_snapshots
  add column idempotency_key uuid,
  add column explored_entity_ids uuid[] not null default '{}';

update counselor.report_snapshots
set idempotency_key = id
where idempotency_key is null;

alter table counselor.report_snapshots
  alter column idempotency_key set not null,
  add constraint report_snapshots_user_idempotency_key_key
    unique (user_id, idempotency_key);

comment on column counselor.conversations.start_idempotency_key is
  'Required; unique with user for retryable start';
comment on column counselor.conversation_messages.idempotency_key is
  'Required; unique within conversation';
comment on column counselor.conversation_messages.client_message_id is
  'Nullable for system copy; scoped to conversation';
comment on column counselor.journey_states.last_idempotency_key is
  'Nullable latest retryable state write';
comment on column counselor.journey_events.producer_event_id is
  'Unique idempotency ID';
comment on column counselor.report_snapshots.idempotency_key is
  'Required; unique with user';
comment on column counselor.report_snapshots.explored_entity_ids is
  'Frozen explored entity IDs for output';
