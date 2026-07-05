# 日新 (Daily Renew) 部署指南

## 项目信息

| 项目 | 地址 |
|------|------|
| 生产域名 | https://rixin.velolabs.top |
| 服务器 | 腾讯云 Ubuntu (118.25.141.173) |
| Supabase | https://supabase.com/dashboard/project/miewnfghzwvuvozskdao |
| 数据库地址 | https://miewnfghzwvuvozskdao.supabase.co |

---

## 方式一：PM2 + Nginx 部署（推荐，适合单服务器）

### 1. 服务器环境准备

SSH 登录服务器：

```bash
ssh root@118.25.141.173
```

安装基础依赖：

```bash
# 更新系统
apt update && apt upgrade -y

# 安装 Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 安装 pnpm（或 npm/yarn）
npm install -g pnpm

# 安装 PM2
npm install -g pm2

# 安装 Nginx
apt install -y nginx

# 安装 Git
apt install -y git
```

验证安装：

```bash
node -v    # v20.x.x
pnpm -v    # 9.x.x
pm2 -v     # 5.x.x
nginx -v   # 1.x.x
```

### 2. 拉取代码

```bash
cd /var/www
git clone <你的仓库地址> rixin
cd rixin
```

### 3. 配置环境变量

```bash
cp .env.example .env.local
nano .env.local
```

填入以下内容：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://miewnfghzwvuvozskdao.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的anon_key

# AI Provider (DeepSeek)
OPENAI_API_KEY=sk-你的deepseek_key

# Site URL
NEXT_PUBLIC_SITE_URL=https://rixin.velolabs.top

# Push Notifications (VAPID) — 可选
NEXT_PUBLIC_VAPID_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=
```

### 4. 安装依赖 & 构建

```bash
cd /var/www/rixin
pnpm install
pnpm build
```

### 5. 配置 PM2

创建 `ecosystem.config.js`（已在项目根目录提供）：

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

常用命令：

```bash
pm2 status        # 查看状态
pm2 logs rixin    # 查看日志
pm2 restart rixin # 重启
pm2 stop rixin    # 停止
```

### 6. 配置 Nginx

创建站点配置：

```bash
nano /etc/nginx/sites-available/rixin.conf
```

参考配置见项目根目录 `deploy/nginx.conf`。

启用配置：

```bash
ln -s /etc/nginx/sites-available/rixin.conf /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### 7. 配置 HTTPS（Let's Encrypt）

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d rixin.velolabs.top
```

Certbot 会自动配置 SSL 证书并开启自动续期。

### 8. 更新 Supabase Auth 回调地址

打开 [Supabase Auth Settings](https://supabase.com/dashboard/project/miewnfghzwvuvozskdao/auth/settings)，添加：

- **Site URL**: `https://rixin.velolabs.top`
- **Redirect URLs**: `https://rixin.velolabs.top/auth/callback`

---

## 方式二：Docker 部署

### 1. 安装 Docker

```bash
curl -fsSL https://get.docker.com | bash -
systemctl enable docker
systemctl start docker
```

### 2. 构建镜像

```bash
cd /var/www/rixin
docker build -t rixin .
```

### 3. 启动容器

```bash
docker run -d \
  --name rixin \
  --restart always \
  -p 3000:3000 \
  -v $(pwd)/.env.local:/app/.env.local \
  rixin
```

### 4. Nginx 反向代理

同方式一第 6 步。

---

## 方式三：Vercel 部署（备选）

如果后续想切回 Vercel 部署：

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录
vercel login

# 3. 部署
vercel

# 4. 设置环境变量
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add OPENAI_API_KEY production
vercel env add NEXT_PUBLIC_SITE_URL production

# 5. 生产部署
vercel --prod
```

Supabase Auth 回调地址：
- **Site URL**: `https://rixin.vercel.app`
- **Redirect URLs**: `https://rixin.vercel.app/auth/callback`

---

## Supabase 配置

### 认证方式

打开 [Supabase Auth Settings](https://supabase.com/dashboard/project/miewnfghzwvuvozskdao/auth/settings)，开启：

- **Magic Link（邮箱）** — Email → 开启 Magic Link
- **Google OAuth** — 在 Google Cloud Console 配置后填入 Client ID 和 Secret

### 数据库迁移

如果 Supabase 数据库还没有执行迁移：

```bash
# 安装 Supabase CLI
npm install -g supabase

# 登录
supabase login

# 链接项目
supabase link --project-ref miewnfghzwvuvozskdao

# 执行迁移
supabase db push
```

---

## 更新部署流程

### PM2 部署更新

```bash
cd /var/www/rixin
git pull
pnpm install
pnpm build
pm2 restart rixin
```

### Docker 部署更新

```bash
cd /var/www/rixin
git pull
docker build -t rixin .
docker stop rixin && docker rm rixin
docker run -d --name rixin --restart always -p 3000:3000 -v $(pwd)/.env.local:/app/.env.local rixin
```

---

## 排障指南

### 查看日志

```bash
# PM2 日志
pm2 logs rixin --lines 200

# Nginx 日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Docker 日志
docker logs rixin -f --tail 200
```

### 常见问题

**页面白屏 / 502 Bad Gateway**
- 检查 Next.js 是否启动：`pm2 status`
- 检查端口是否监听：`netstat -tlnp | grep 3000`
- 查看日志：`pm2 logs rixin`

**Supabase 连接失败**
- 确认 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 正确
- 检查服务器网络是否能访问 supabase.co

**AI 功能不工作**
- 确认 `OPENAI_API_KEY` 已设置
- 检查 DeepSeek 账户余额
- 查看 API 路由日志
