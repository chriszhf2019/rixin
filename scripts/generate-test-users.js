const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const testUsers = [
  {
    email: 'test1@rixin.dev',
    password: 'Test@123456',
    name: '测试用户一',
  },
  {
    email: 'test2@rixin.dev',
    password: 'Test@123456',
    name: '测试用户二',
  },
];

async function createTestUser(user) {
  try {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { full_name: user.name },
    });

    if (authError) {
      if (authError.message.includes('duplicate')) {
        console.log(`User ${user.email} already exists, skipping...`);
        return null;
      }
      throw authError;
    }

    const userId = authData.user.id;
    console.log(`Created auth user: ${user.email} (id: ${userId})`);

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ id: userId, name: user.name });

    if (profileError) {
      console.log(`Profile may already exist for ${user.email}`);
    }

    return userId;
  } catch (error) {
    console.error(`Failed to create user ${user.email}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('Creating test users...\n');

  for (const user of testUsers) {
    await createTestUser(user);
    console.log('');
  }

  console.log('Test users created successfully!');
  console.log('\nTest accounts:');
  testUsers.forEach(user => {
    console.log(`  Email: ${user.email}`);
    console.log(`  Password: ${user.password}`);
    console.log(`  Name: ${user.name}`);
    console.log('');
  });
}

main().catch(console.error);