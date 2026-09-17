-- Assignment status: teacher-controlled lifecycle on top of the existing
-- due_at field. 'active' assignments still auto-display/behave as ended
-- once their due date passes (computed in the app, not here) — this column
-- is for the explicit states a teacher sets directly: ending early,
-- reopening, or cancelling (voiding) an assignment.

alter table public.assignments
  add column if not exists status text not null default 'active'
  check (status in ('active', 'ended', 'cancelled'));

-- No RLS change needed: "Teachers manage assignments in own classes" is
-- already `for all` on the whole row, so it already covers updating or
-- deleting based on this new column.
