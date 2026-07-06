#!/bin/bash
set -e

# 检查 certbot 是否安装
if ! command -v certbot &> /dev/null; then
    echo "Installing certbot..."
    apt update
    apt install -y certbot python3-certbot-nginx
fi

# 获取 SSL 证书
echo "Getting SSL certificate for rixin.velolabs.top..."
certbot --nginx -d rixin.velolabs.top --non-interactive --agree-tos --email chris@velolabs.top --redirect

echo "HTTPS configured successfully"