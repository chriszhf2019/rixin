import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const MIGRATION_SQL = `
-- 经验卡片表（个人知识库）
create table if not exists public.experience_cards (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  task_id uuid references public.tasks(id) on delete set null,
  title text not null,
  content text not null,
  category text default 'lesson' check (category in ('lesson', 'insight', 'method', 'resource')),
  tags text[] default '{}',
  task_title text,
  actual_minutes int,
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.experience_cards enable row level security;

drop policy if exists "Users can manage own experience cards" on public.experience_cards;
create policy "Users can manage own experience cards"
  on public.experience_cards for all
  using (auth.uid() = user_id);

-- 任务模板表（SOP模板库）
create table if not exists public.task_templates (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  category text default 'general',
  use_count int default 0,
  subtasks jsonb default '[]'::jsonb,
  estimated_minutes int default 30,
  created_at timestamptz default now(),
  last_used_at timestamptz
);
alter table public.task_templates enable row level security;

drop policy if exists "Users can manage own task templates" on public.task_templates;
create policy "Users can manage own task templates"
  on public.task_templates for all
  using (auth.uid() = user_id);

-- 更新 tasks 表：添加 task_type 和 blocker_reason 字段
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'tasks' and column_name = 'task_type') then
    alter table public.tasks add column task_type text default 'inbox' check (task_type in ('objective', 'inbox', 'routine'));
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'tasks' and column_name = 'blocker_reason') then
    alter table public.tasks add column blocker_reason text check (blocker_reason in ('too_complex', 'time_conflict', 'procrastination') or blocker_reason is null);
  end if;
end $$;

-- 更新 updated_at 触发器
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists experience_cards_updated_at on public.experience_cards;
create trigger experience_cards_updated_at
  before update on public.experience_cards
  for each row execute function public.handle_updated_at();

drop trigger if exists task_templates_updated_at on public.task_templates;
create trigger task_templates_updated_at
  before update on public.task_templates
  for each row execute function public.handle_updated_at();

-- 创建索引
create index if not exists idx_experience_cards_user_id on public.experience_cards(user_id);
create index if not exists idx_experience_cards_created_at on public.experience_cards(created_at desc);
create index if not exists idx_task_templates_user_id on public.task_templates(user_id);
create index if not exists idx_task_templates_last_used on public.task_templates(last_used_at desc nulls last);
`;

export async function POST(request: Request) {
  try {
    const { password, authType = 'password' } = await request.json();

    if (!password) {
      return NextResponse.json({ error: '数据库密码或密钥不能为空' }, { status: 400 });
    }

    const projectRef = 'miewnfghzwvuvozskdao';
    let connectionString: string;

    if (authType === 'service_role') {
      // 使用 service role key 通过 Supabase REST API 执行 SQL
      // 先创建 exec_sql 函数
      const createFunctionRes = await fetch(`https://${projectRef}.supabase.co/rest/v1/`, {
        method: 'POST',
        headers: {
          'apikey': password,
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `CREATE OR REPLACE FUNCTION public.exec_sql(query text) RETURNS text AS $$ BEGIN EXECUTE query; RETURN 'success'; END; $$ LANGUAGE plpgsql SECURITY DEFINER;`
        }),
      });

      if (createFunctionRes.ok) {
        const createResData = await createFunctionRes.json();
        console.log('Function created:', createResData);
      }

      // 执行迁移 SQL
      const migrationRes = await fetch(`https://${projectRef}.supabase.co/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': password,
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: MIGRATION_SQL }),
      });

      if (migrationRes.ok) {
        const data = await migrationRes.json();
        return NextResponse.json({
          message: '迁移成功！',
          result: data,
        });
      } else {
        const errorData = await migrationRes.json();
        return NextResponse.json(
          { error: `迁移失败：${JSON.stringify(errorData)}` },
          { status: 500 }
        );
      }
    } else {
      // 使用数据库密码直接连接
      connectionString = `postgresql://postgres.${projectRef}:${password}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;

      const pool = new Pool({
        connectionString,
        connectionTimeoutMillis: 10000,
        ssl: { rejectUnauthorized: false },
      });

      try {
        const client = await pool.connect();
        try {
          await client.query(MIGRATION_SQL);

          const { rows } = await client.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name IN ('experience_cards', 'task_templates')
          `);

          const tables = rows.map(r => r.table_name);

          return NextResponse.json({
            message: `迁移成功！已创建表：${tables.join(', ')}\n已添加 tasks 表字段：task_type, blocker_reason\n已配置 RLS 安全策略和索引`,
            tables,
          });
        } finally {
          client.release();
        }
      } finally {
        await pool.end();
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('password authentication failed')) {
      return NextResponse.json(
        { error: '数据库密码错误，请检查后重试' },
        { status: 401 }
      );
    }

    if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
      return NextResponse.json(
        { error: '连接超时，可能是区域不匹配。请确认数据库密码正确，或尝试在 Supabase Dashboard SQL Editor 中手动执行迁移 SQL。' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: `迁移失败：${errorMessage}` },
      { status: 500 }
    );
  }
}
