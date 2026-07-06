#!/bin/bash

cd /var/www/rixin

if [ -f .env.local ]; then
  export $(cat .env.local | sed 's/#.*//g' | xargs)
fi

cat > scripts/generate-test-users.js << 'EOF'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const authUrl = supabaseUrl + '/auth/v1/signup';
const signinUrl = supabaseUrl + '/auth/v1/token?grant_type=password';

const testUsers = [
  { email: 'test1@rixin.dev', password: 'Test@123456', name: 'Test User One' },
  { email: 'test2@rixin.dev', password: 'Test@123456', name: 'Test User Two' },
];

async function signinUser(user) {
  try {
    const response = await fetch(signinUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({
        email: user.email,
        password: user.password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.msg && data.msg.includes('User not found')) {
        return null;
      }
      console.log('Signin error for', user.email, ':', data.msg);
      return null;
    }

    return data.user;
  } catch (e) {
    return null;
  }
}

async function createUser(user) {
  try {
    const existingUser = await signinUser(user);
    if (existingUser) {
      console.log('User exists:', user.email);
      return;
    }

    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': 'Bearer ' + supabaseAnonKey,
      },
      body: JSON.stringify({
        email: user.email,
        password: user.password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL + '/auth/callback',
          data: { full_name: user.name },
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.log('Error creating', user.email, ':', data.msg || JSON.stringify(data));
      return;
    }

    console.log('Created:', user.email);
    
    if (data.user?.id) {
      const profileUrl = supabaseUrl + '/rest/v1/profiles';
      await fetch(profileUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': 'Bearer ' + supabaseAnonKey,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          id: data.user.id,
          name: user.name,
        }),
      }).catch(() => {});
    }
  } catch (e) {
    console.log('Failed:', user.email, '-', e.message);
  }
}

(async () => {
  for (const u of testUsers) {
    await createUser(u);
    await new Promise(r => setTimeout(r, 5000));
  }
  console.log('\nDone!');
})();
EOF

node scripts/generate-test-users.js