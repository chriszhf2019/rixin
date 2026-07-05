#!/bin/bash
set -e

# ============================================
# 日新 Daily Renew 更新脚本
# ============================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_DIR="/var/www/rixin"

echo -e "${YELLOW}开始更新部署...${NC}"

cd $PROJECT_DIR

echo -e "${YELLOW}[1/4] 拉取最新代码...${NC}"
git pull

echo -e "${YELLOW}[2/4] 安装依赖...${NC}"
npm ci

echo -e "${YELLOW}[3/4] 构建项目...${NC}"
npm run build

echo -e "${YELLOW}[4/4] 重启应用...${NC}"
pm2 restart ecosystem.config.js

echo -e "${GREEN}✓ 更新完成！${NC}"
pm2 status
