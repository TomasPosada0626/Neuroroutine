import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import { env } from 'node:process';

// Real end-to-end coverage of the part of password recovery that no other test touches: actually
// landing on /reset-password with a valid recovery session and setting a new password. We can't
// open a real inbox in CI, so instead of clicking an emailed link we mint an equivalent one
// ourselves via the Admin API (`generateLink`) using a service-role key — this produces the exact
// same GoTrue verify-then-redirect flow a real email link would, just without needing an inbox.
//
// Requires the Supabase project's Auth settings (Additional Redirect URLs) to allow this app's
// local preview origin (e.g. http://localhost:4173/reset-password) — see
// docs/github/manual-actions-checklist.md.
test('reset-password: a real recovery link lets the user set a new password and sign in with it', async ({
  page,
  baseURL,
}) => {
  test.skip(
    !env.E2E_SUPABASE_SERVICE_ROLE_KEY || !env.VITE_SUPABASE_URL || !env.E2E_USER_IDENTIFIER,
    'Set E2E_SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_URL and E2E_USER_IDENTIFIER (a real test ' +
      "account's email) to enable this test",
  );

  const admin = createClient(env.VITE_SUPABASE_URL!, env.E2E_SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const newPassword = `E2E-reset-${Date.now()}`;

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: env.E2E_USER_IDENTIFIER!,
    options: { redirectTo: `${baseURL}/reset-password` },
  });
  expect(error).toBeNull();
  const actionLink = data?.properties?.action_link;
  expect(actionLink).toBeTruthy();

  // Following the real GoTrue verify link redirects back into the app with a recovery session
  // already established (the same thing clicking the emailed link does).
  await page.goto(actionLink!);
  await expect(page).toHaveURL(/\/reset-password/);
  await expect(page.getByRole('heading', { name: 'Elige una nueva contraseña' })).toBeVisible();

  await page.getByLabel('Nueva contraseña').fill(newPassword);
  await page.getByLabel('Confirmar contraseña').fill(newPassword);
  await page.getByRole('button', { name: 'Guardar nueva contraseña' }).click();

  await expect(page).toHaveURL(/\/app/);

  // Prove the new password actually works by signing out and back in with it.
  await page.evaluate(() => localStorage.clear());
  await page.goto('/login');
  await page.getByTestId('login-identifier').fill(env.E2E_USER_IDENTIFIER!);
  await page.getByTestId('login-password').fill(newPassword);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/app/);

  // Leave the account in a known state for the next run/other specs sharing it.
  if (env.E2E_USER_PASSWORD) {
    const { data: users } = await admin.auth.admin.listUsers();
    const testUser = users.users.find((u) => u.email === env.E2E_USER_IDENTIFIER);
    if (testUser) {
      await admin.auth.admin.updateUserById(testUser.id, { password: env.E2E_USER_PASSWORD });
    }
  }
});
