alter table communications
  add column if not exists inbox_labels text[] not null default '{}';

comment on column communications.inbox_labels is 'Tags set by committee/manager in the leadership inbox.';
