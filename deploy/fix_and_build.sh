#!/bin/bash
cd /var/www/rixin

# 修改 tsconfig.json 排除 supabase/functions
sed -i 's/"exclude": \["node_modules"\]/"exclude": ["node_modules", "supabase\/functions"]/' tsconfig.json
echo "Updated tsconfig.json"

# 安装缺失依赖
npm install @radix-ui/react-progress@^1.1.2 --save

# 构建
npm run build