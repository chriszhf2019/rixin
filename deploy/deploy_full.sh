#!/bin/bash
set -e

cd /var/www/rixin

echo "=== PM2 Setup ==="

if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

pm2 stop rixin 2>/dev/null || true
pm2 delete rixin 2>/dev/null || true

pm2 start npm --name "rixin" -- start
pm2 save

echo "=== Nginx Setup ==="

sudo tee /etc/nginx/sites-available/rixin > /dev/null << 'NGINX'
server {
    listen 80;
    server_name rixin.velolabs.top;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/rixin /etc/nginx/sites-enabled/rixin
sudo nginx -t && sudo systemctl reload nginx

echo "=== Done ==="
