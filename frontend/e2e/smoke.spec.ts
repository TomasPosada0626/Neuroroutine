import { expect, test } from '@playwright/test';
import { env } from 'node:process';
import { apiLogin } from './helpers/auth';

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

test('forgot password shows a generic confirmation regardless of outcome', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('link', { name: '¿Olvidaste tu contraseña?' }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  await expect(page.getByRole('heading', { name: 'Recupera tu contraseña' })).toBeVisible();

  await page.locator('#forgot-password-email').fill('someone@example.com');
  await page.getByRole('button', { name: 'Enviar enlace de recuperación' }).click();

  await expect(page.getByText(/Si existe una cuenta con ese correo/)).toBeVisible();
});

test('authenticated happy path (optional, requires real Supabase creds)', async ({ page }) => {
  test.skip(
    !env.E2E_USER_IDENTIFIER || !env.E2E_USER_PASSWORD,
    'Set E2E_USER_IDENTIFIER and E2E_USER_PASSWORD to enable this test',
  );

  await apiLogin(page, env.E2E_USER_IDENTIFIER!, env.E2E_USER_PASSWORD!);

  // After login we should be in /app.
  await expect(page).toHaveURL(/\/app/);
});
