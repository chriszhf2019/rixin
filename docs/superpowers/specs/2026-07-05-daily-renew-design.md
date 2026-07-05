# 日新 (Daily Renew) — 设计文档

**日期：** 2026-07-05
**版本：** v0.1 (MVP)

## 1. 核心理念

日新出自《大学》"苟日新，日日新，又日新"——不是简单的待办应用，而是一套**个人成长系统**。

**日新循环：** Plan（规划）→ Do（执行）→ Review（复盘）→ Renew（更新）

核心价值：利用 AI 把每天的"琐事"和"长期目标"连接起来，让每件小事都有方向，每个目标都有反馈。

## 2. 产品定位

- **Slogan：** 日有所进，日有所新 / Step by step, Day by day renewed
- **目标用户：** 追求持续成长的个人 + 需要轻量协作的小团队
- **差异化：** AI 陪伴式成长助手 + 目标层层分解体系 + 内置复盘机制

## 3. 技术架构

```
用户端 (PWA + 响应式 Web)  ← Next.js 15 App Router
    │
Vercel (部署 + Edge)
    │
Supabase:
  ├─ PostgreSQL       ← 核心数据
  ├─ Auth             ← 登录认证 (魔法链接 / OAuth)
  ├─ Realtime         ← 协作同步 + 推送
  └─ Storage          ← 附件/语音文件
    │
AI Layer (Vercel AI SDK)
  ├─ LLM: GPT-4o / Claude
  ├─ NLP 输入解析
  ├─ 语音: Whisper API
  └─ Streaming 响应
```

## 4. 数据模型

### 核心实体

```
User (id, name, email, avatar, preferences)
  └─ Goal (id, user_id, title, description, quarter, year, status)
       └─ MonthlyPlan (id, goal_id, title, month, year, status)
            └─ WeeklyPlan (id, monthly_id, title, week_number, status)
                 └─ Task (id, weekly_id, title, description, due_date, priority, status, assignee_id)
                      ├─ Subtask (id, task_id, title, done)
                      ├─ Comment (id, task_id, user_id, content, created_at)
                      ├─ Attachment (id, task_id, file_url, type)
                      └─ Reminder (id, task_id, remind_at, type)

Tag (id, name, color)
TaskTag (task_id, tag_id)

TeamActivity (id, title, date, location, organizer_id)
  └─ ActivityMember (activity_id, user_id, role)
  └─ ActivityTask (activity_id, task_id)

Review (id, user_id, type[day|week|month|quarter], period_start, period_end, content, ai_summary)

AISuggestion (id, user_id, type, content, applied, created_at)
```

## 5. V1 功能范围 (MVP)

| 功能 | V1 (本版) | 后续 |
|------|-----------|------|
| 用户认证 | 邮箱 + 魔法链接 / Google OAuth | 更多 OAuth |
| 快速输入 | 文字 NLP 解析 | 语音输入 |
| 规划体系 | 季度→月→周→日 完整链路 | 自定义层级 |
| 今日视图 | 今日待办 + 进度环 | 番茄钟 |
| 团队协作 | 任务分配 + 共享清单 + 评论 | 活动管理 |
| 复盘 | AI 日摘要 + 周/月报表 | 季度复盘 |
| AI 助手 | NLP 解析 + 每日简报 + 关联分析 | 对话式助手 |
| 提醒 | 时间提醒 | 智能推送 |
| 移动端 | PWA + 响应式设计 | 原生 App |

## 6. UI 布局

### 移动端：底部 4 Tab

```
┌──────────┬──────────────┬─────────────┬─────────────┐
│   今日    │    规划      │    复盘      │   助手      │
│  执行     │    Plan      │   Review    │  AI Chat    │
├──────────┼──────────────┼─────────────┼─────────────┤
│ 今日清单  │ 目标树       │ 时间轴复盘   │ 智能录入    │
│ 进度环    │ (季度→月→周) │ AI 摘要     │ 对话查询    │
│ 快速+    │ 进度条       │ 数据看板    │ 效率报告    │
└──────────┴──────────────┴─────────────┴─────────────┘
```

### 桌面端：左侧导航 + 内容区

```
┌──────┬─────────────────────────────────────┐
│ Logo │                                     │
│──────│                                     │
│ 今日  │         内容区                      │
│ 规划  │                                     │
│ 复盘  │                                     │
│ 助手  │                                     │
│──────│                                     │
│ 设置  │                                     │
└──────┴─────────────────────────────────────┘
```

## 7. AI 能力 (V1)

1. **NLP 输入解析：** 自然语言 → 结构化任务（内容、时间、优先级、标签）
2. **任务拆解：** 大任务 → 子任务建议
3. **每日简报：** 早上"今日展望" + 晚上"今日复盘"
4. **关联分析：** 发现任务间依赖、任务-目标关联、延期提醒
5. **效率报告：** 每周/月自动生成完成率与趋势

## 8. 技术栈明细

| 类别 | 选型 |
|------|------|
| 框架 | Next.js 15+ (App Router) |
| 语言 | TypeScript |
| 样式 | Tailwind CSS |
| UI 组件 | shadcn/ui |
| 数据库 | Supabase PostgreSQL |
| ORM | Supabase SDK (直接查询) / Drizzle ORM |
| 认证 | Supabase Auth |
| 存储 | Supabase Storage |
| 实时 | Supabase Realtime |
| AI | Vercel AI SDK + OpenAI/Anthropic |
| 部署 | Vercel |
| PWA | next-pwa / 内置 Service Worker |
