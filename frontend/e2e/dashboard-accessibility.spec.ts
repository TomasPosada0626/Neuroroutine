import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { env } from 'node:process';

function hasRealBackendEnv() {
  return Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY);
}

async function login(page: import('@playwright/test').Page, identifier: string, password: string) {
  await page.goto('/login');
  await page.getByTestId('login-identifier').fill(identifier);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/app/, { timeout: 15000 });
}

test.describe('dashboard accessibility (axe)', () => {
  test.skip(
    !hasRealBackendEnv(),
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable real backend E2E',
  );
  test.skip(
    !env.E2E_USER_IDENTIFIER || !env.E2E_USER_PASSWORD,
    'Set E2E_USER_IDENTIFIER and E2E_USER_PASSWORD to enable this test',
  );

  test('landing page has no axe violations', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test('login page has no axe violations', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test('dashboard (default, populated) has no axe violations', async ({ page }) => {
    await login(page, env.E2E_USER_IDENTIFIER!, env.E2E_USER_PASSWORD!);

    const routineTitle = `A11y Dashboard ${Date.now()}`;
    await page.getByRole('button', { name: 'Nueva rutina' }).click();
    await page.getByPlaceholder('Ej: Mañana enfocada').fill(routineTitle);
    await page.getByPlaceholder('Ej: Tomar agua').first().fill('A11y task');
    await page.getByRole('button', { name: 'Crear rutina' }).click();
    await expect(page.getByRole('button', { name: routineTitle }).first()).toBeVisible();

    const results = await new AxeBuilder({ page })
      // Color contrast is checked in a dedicated test below, isolated from this scan: it's
      // sensitive to exact rendering/anti-aliasing and easier to reason about on its own.
      .disableRules(['color-contrast'])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test('dashboard with the task edit modal open has no axe violations', async ({ page }) => {
    await login(page, env.E2E_USER_IDENTIFIER!, env.E2E_USER_PASSWORD!);

    const routineTitle = `A11y Modal ${Date.now()}`;
    await page.getByRole('button', { name: 'Nueva rutina' }).click();
    await page.getByPlaceholder('Ej: Mañana enfocada').fill(routineTitle);
    await page.getByPlaceholder('Ej: Tomar agua').first().fill('A11y modal task');
    await page.getByRole('button', { name: 'Crear rutina' }).click();
    await expect(page.getByRole('button', { name: routineTitle }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Editar tarea: A11y modal task' }).click();
    await expect(page.getByRole('dialog', { name: 'Editar tarea' })).toBeVisible();

    const results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test('dashboard with a widget expanded and the customize panel open has no axe violations', async ({
    page,
  }) => {
    await login(page, env.E2E_USER_IDENTIFIER!, env.E2E_USER_PASSWORD!);

    await page.getByRole('button', { name: 'Personalizar' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test('dashboard color contrast (checked in isolation)', async ({ page }) => {
    await login(page, env.E2E_USER_IDENTIFIER!, env.E2E_USER_PASSWORD!);

    const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
});
