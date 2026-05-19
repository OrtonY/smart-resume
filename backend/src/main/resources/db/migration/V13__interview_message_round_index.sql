alter table interview_messages
    add column if not exists round_index integer not null default 0;

-- Backfill round_index for existing rows.
-- Heuristic (mirrors the legacy in-memory logic in InterviewService.countQuestionsInCurrentRound):
-- the first message in a session belongs to round 0; a new round begins on every INTERVIEWER
-- message immediately preceded (by sort_order) by another INTERVIEWER message, because nextRound
-- inserts a new opening question right after the previous round's last interviewer reply.
with ordered as (
    select
        id,
        session_id,
        role,
        sort_order,
        lag(role) over (partition by session_id order by sort_order) as prev_role
    from interview_messages
),
boundaries as (
    select
        id,
        session_id,
        sort_order,
        case
            when role = 'INTERVIEWER' and prev_role = 'INTERVIEWER' then 1
            else 0
        end as is_round_start
    from ordered
),
computed as (
    select
        id,
        sum(is_round_start) over (
            partition by session_id
            order by sort_order
            rows between unbounded preceding and current row
        ) as computed_round_index
    from boundaries
)
update interview_messages m
set round_index = c.computed_round_index
from computed c
where m.id = c.id;

create index if not exists idx_interview_messages_session_round
    on interview_messages (session_id, round_index, sort_order);
