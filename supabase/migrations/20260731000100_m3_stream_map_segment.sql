alter table knowledge.stream_maps
  add column if not exists segment text;

alter table knowledge.stream_maps
  drop constraint if exists stream_maps_segment_check;

alter table knowledge.stream_maps
  add constraint stream_maps_segment_check
  check (
    segment is null
    or segment in ('explorer', 'pathfinder', 'launcher')
  );

alter table knowledge.stream_map_items
  drop constraint if exists stream_map_items_rank_key;

create unique index if not exists stream_map_items_map_rank_key
  on knowledge.stream_map_items (map_id, rank);

create unique index if not exists stream_maps_lookup_version_key
  on knowledge.stream_maps (
    top_two_code,
    segment,
    version,
    dataset_version_id
  )
  where segment is not null;

comment on column knowledge.stream_maps.segment is
  'Student journey segment: explorer, pathfinder, or launcher';
