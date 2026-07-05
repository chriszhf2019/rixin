# 日新 (Daily Renew) 部署指南

## ✅ 已完成

### Supabase 数据库（已创建并迁移）
- 项目名: `rixin`
- 区域: ap-southeast-1 (新加坡)
- 项目 URL: `https://miewnfghzwvuvozskdao.supabase.co`
- 4 个迁移全部执行成功

### 环境变量（已写入 `.env.local`）
- `NEXT_PUBLIC_SUPABASE_URL` ✅
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅

## 📋 你需要完成的步骤

### 1. 打开 Supabase Auth 设置

前往 https://supabase.com/dashboard/project/miewnfghzwvuvozskdao/auth/settings

开启以下认证方式：
- **Magic Link（邮箱）** — 切换到 Email → 开启 Magic Link
- **Google OAuth** — 在 Google Cloud Console 配置后填入 Client ID 和 Secret

### 2. 配置 OpenAI API Key

在 `.env.local` 中添加：
```
OPENAI_API_KEY=sk-your_key_here
```

### 3. 部署到 Vercel

打开终端执行：

```bash
# 1. 安装 Vercel CLI（如果没有）
npm i -g vercel

# 2. 登录 Vercel
vercel login

# 3. 在项目目录部署
cd /Volumes/z/202606/Rixin
vercel

# 4. 设置生产环境变量
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add OPENAI_API_KEY production

# 5. 部署到生产
vercel --prod
```

### 4. 配置 Auth 回调 URL

在 Supabase Auth 设置中，添加：
- Site URL: `https://rixin.vercel.app`
- Redirect URLs: `https://rixin.vercel.app/auth/callback`

## 项目信息

| 项目 | 地址 |
|------|------|
| Supabase | https://supabase.com/dashboard/project/miewnfghzwvuvozskdao |
| Vercel | https://vercel.com/chriszhaos-projects |

---

部署完成后打开浏览器访问 Vercel 分配的 URL 即可使用。
