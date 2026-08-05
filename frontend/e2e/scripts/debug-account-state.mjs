import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const serviceRole = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
const idA = process.env.E2E_USER_IDENTIFIER;
const idB = process.env.E2E_USER_B_IDENTIFIER;

if (!url || !serviceRole) {
  console.log('Missing VITE_SUPABASE_URL or E2E_SUPABASE_SERVICE_ROLE_KEY - skipping.');
  process.exit(0);
}

const admin = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });

if (error) {
  console.log('listUsers() FAILED - service_role key is likely wrong/expired:', error.message);
  process.exit(0);
}

console.log(`Total users in project: ${data.users.length}`);

for (const [label, email] of [
  ['E2E_USER_IDENTIFIER (A)', idA],
  ['E2E_USER_B_IDENTIFIER (B)', idB],
]) {
  if (!email) {
    console.log(`${label}: secret not set`);
    continue;
  }
  const user = data.users.find((u) => u.email === email);
  if (!user) {
    console.log(`${label}: NO account found for this exact email`);
    continue;
  }
  console.log(
    `${label}: FOUND - id=${user.id} confirmed=${Boolean(user.confirmed_at)} created_at=${user.created_at} last_sign_in_at=${user.last_sign_in_at ?? 'never'}`,
  );
}

// Also list any account whose email looks like our known test-account pattern, in case the
// exact identifier stored in the secret drifted (typo, plus-tag change, etc).
const lookalikes = data.users.filter((u) => u.email?.includes('agendatomas2025'));
console.log(
  'Accounts matching "agendatomas2025":',
  lookalikes.map((u) => u.email),
);
