-- Kết quả thi thử (đề thi được sinh từ kho từ vựng nên KHÔNG cần bảng đề).
-- Chạy file này trong Supabase → SQL Editor. Chưa chạy thì app vẫn hoạt động, kết quả chỉ lưu trong trình duyệt.
create table if not exists public.exam_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  track text not null,              -- 'HSK 3' | 'cat:<uuid ngành>'
  exam_no int not null,             -- số đề, 1..100 (HSK 7-9: 1..300)
  score int not null,               -- 0-100
  correct int not null,
  total int not null,
  duration_seconds int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists exam_results_user_track on public.exam_results (user_id, track, exam_no);

alter table public.exam_results disable row level security;
grant all on public.exam_results to anon, authenticated;
