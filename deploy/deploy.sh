#!/bin/bash
set -e

# ============================================
# 日新 (Daily Renew) 一键部署脚本
# 适用环境：腾讯云 Ubuntu 22.04 / 20.04
# 域名：rixin.velolabs.top
# ============================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_DIR="/var/www/rixin"
GIT_REPO="https://github.com/chriszhf2019/rixin.git"
DOMAIN="rixin.velolabs.top"
NODE_VERSION="20"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  日新 Daily Renew 一键部署脚本${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# ============================================
# 0. 检查是否为 root 用户
# ============================================
if [[ $EUID -ne 0 ]]; then
    echo -e "${RED}请使用 root 用户运行此脚本${NC}"
    echo "执行: sudo su"
    exit 1
fi

# ============================================
# 1. 更新系统
# ============================================
echo -e "${YELLOW}[1/8] 更新系统...${NC}"
apt update -y
apt upgrade -y
apt install -y curl git wget nginx ufw
echo -e "${GREEN}✓ 系统更新完成${NC}"
echo ""

# ============================================
# 2. 安装 Node.js
# ============================================
echo -e "${YELLOW}[2/8] 安装 Node.js ${NODE_VERSION}...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt install -y nodejs
fi
echo -e "${GREEN}✓ Node.js 版本: $(node -v)${NC}"
echo -e "${GREEN}✓ npm 版本: $(npm -v)${NC}"
echo ""

# ============================================
# 3. 安装 PM2
# ============================================
echo -e "${YELLOW}[3/8] 安装 PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi
echo -e "${GREEN}✓ PM2 版本: $(pm2 -v)${NC}"
echo ""

# ============================================
# 4. 拉取代码
# ============================================
echo -e "${YELLOW}[4/8] 拉取代码...${NC}"
if [ -d "$PROJECT_DIR" ]; then
    echo "项目目录已存在，执行 git pull 更新..."
    cd $PROJECT_DIR
    git pull
else
    echo "克隆代码仓库..."
    mkdir -p /var/www
    cd /var/www
    git clone $GIT_REPO rixin
    cd $PROJECT_DIR
fi
echo -e "${GREEN}✓ 代码已同步${NC}"
echo ""

# ============================================
# 5. 配置环境变量
# ============================================
echo -e "${YELLOW}[5/8] 配置环境变量...${NC}"
if [ ! -f "$PROJECT_DIR/.env.local" ]; then
    cp $PROJECT_DIR/.env.example $PROJECT_DIR/.env.local
    echo -e "${YELLOW}⚠️  已生成 .env.local，请手动填入密钥后重新构建${NC}"
    echo -e "${YELLOW}   编辑命令: nano $PROJECT_DIR/.env.local${NC}"
else
    echo -e "${GREEN}✓ .env.local 已存在${NC}"
fi
echo ""

# ============================================
# 6. 安装依赖 & 构建
# ============================================
echo -e "${YELLOW}[6/8] 安装依赖 & 构建项目...${NC}"
cd $PROJECT_DIR
npm ci
npm run build
mkdir -p logs
echo -e "${GREEN}✓ 构建完成${NC}"
echo ""

# ============================================
# 7. 启动 PM2
# ============================================
echo -e "${YELLOW}[7/8] 启动应用...${NC}"
cd $PROJECT_DIR
if pm2 list | grep -q "rixin"; then
    echo "应用已存在，执行重启..."
    pm2 restart ecosystem.config.js
else
    echo "启动新应用..."
    pm2 start ecosystem.config.js
fi
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash
echo -e "${GREEN}✓ 应用已启动${NC}"
pm2 status
echo ""

# ============================================
# 8. 配置 Nginx
# ============================================
echo -e "${YELLOW}[8/8] 配置 Nginx...${NC}"

# 移除默认站点
rm -f /etc/nginx/sites-enabled/default

# 复制配置文件
cp $PROJECT_DIR/deploy/nginx.conf /etc/nginx/sites-available/rixin.conf

# 启用站点
ln -sf /etc/nginx/sites-available/rixin.conf /etc/nginx/sites-enabled/

# 测试配置
nginx -t

# 重载 Nginx
systemctl reload nginx
systemctl enable nginx
echo -e "${GREEN}✓ Nginx 配置完成${NC}"
echo ""

# ============================================
# 防火墙配置
# ============================================
echo -e "${YELLOW}配置防火墙...${NC}"
ufw allow 'Nginx Full'
ufw allow OpenSSH
echo "y" | ufw enable || true
echo -e "${GREEN}✓ 防火墙已配置${NC}"
echo ""

# ============================================
# 完成
# ============================================
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "🌐 访问地址: http://${DOMAIN}"
echo ""
echo "📋 下一步操作："
echo ""
echo "  1. 配置 HTTPS (可选但推荐):"
echo "     apt install -y certbot python3-certbot-nginx"
echo "     certbot --nginx -d ${DOMAIN}"
echo ""
echo "  2. 配置 Supabase Auth 回调地址："
echo "     Site URL: https://${DOMAIN}"
echo "     Redirect URLs: https://${DOMAIN}/auth/callback"
echo ""
echo "  3. 常用命令："
echo "     pm2 status       # 查看状态"
echo "     pm2 logs rixin   # 查看日志"
echo "     pm2 restart rixin # 重启应用"
echo "     nginx -t         # 测试 Nginx 配置"
echo ""

if [ ! -f "$PROJECT_DIR/.env.local" ] || ! grep -q "your_supabase_project_url\|your_deepseek" "$PROJECT_DIR/.env.local"; then
    echo ""
else
    echo -e "${YELLOW}⚠️  请检查 .env.local 中的密钥配置是否正确${NC}"
fi
