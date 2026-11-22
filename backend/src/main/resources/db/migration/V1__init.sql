create table calendar (
    id      uuid primary key,
    name    text    not null,
    color   text    not null,
    visible boolean not null,
    seq     bigserial
);

create table item (
    id          uuid primary key,
    calendar_id uuid    not null references calendar (id) on delete cascade,
    type        text    not null check (type in ('event', 'task')),
    title       text    not null,
    memo        text,
    date        date    not null,
    start_time  time,
    end_date    date,
    end_time    time,
    done        boolean not null,
    seq         bigserial
);

create index item_calendar_id_idx on item (calendar_id);
create index item_date_idx on item (date);

insert into calendar (id, name, color, visible)
values (gen_random_uuid(), '내 캘린더', '#4a7bd8', true);
