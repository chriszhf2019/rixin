#!/bin/bash
cd /var/www/rixin

# Add Service Role Key to .env.local
if ! grep -q "SUPABASE_SERVICE_ROLE_KEY" .env.local; then
  echo "" >> .env.local
  echo "SUPABASE_SERVICE_ROLE_KEY=SERVICE_ROLE_KEY_PLACEHOLDER" >> .env.local
fi

# Add ADMIN_SECRET
if ! grep -q "ADMIN_SECRET" .env.local; then
  echo "ADMIN_SECRET=rixin-admin-2026" >> .env.local
fi

# Build
npm run build

# Restart PM2
pm2 restart rixin

echo "Update complete"