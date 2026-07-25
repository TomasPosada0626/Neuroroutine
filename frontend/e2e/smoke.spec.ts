import { expect, test } from '@playwright/test';
import { env } from 'node:process';

test('landing loads and can navigate to login', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: /Rutinas inteligentes,\s*progreso visible\./i }),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/login$/);

  await expect(page.getByRole('heading', { name: 'Continúa donde lo dejaste' })).toBeVisible();

  // Basic form presence; we don't attempt login without real backend.
  await expect(page.getByTestId('login-identifier')).toBeVisible();
  await expect(page.getByTestId('login-password')).toBeVisible();
  await expect(page.getByTestId('login-submit')).toBeVisible();
});

test('authenticated happy path (optional, requires real Supabase creds)', async ({ page }) => {
  test.skip(
    !env.E2E_USER_IDENTIFIER || !env.E2E_USER_PASSWORD,
    'Set E2E_USER_IDENTIFIER and E2E_USER_PASSWORD to enable this test',
  );

  await page.goto('/login');
  await page.getByTestId('login-identifier').fill(env.E2E_USER_IDENTIFIER!);
  await page.getByTestId('login-password').fill(env.E2E_USER_PASSWORD!);
  await page.getByTestId('login-submit').click();

  // After login we should be in /app.
  await expect(page).toHaveURL(/\/app/);
});
