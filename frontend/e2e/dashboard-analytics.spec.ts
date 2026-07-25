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

test('completing a task feeds the dashboard analytics for its routine', async ({ page }) => {
  test.skip(
    !hasRealBackendEnv(),
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable real backend E2E',
  );
  test.skip(
    !env.E2E_USER_IDENTIFIER || !env.E2E_USER_PASSWORD,
    'Set E2E_USER_IDENTIFIER and E2E_USER_PASSWORD to enable this test',
  );

  await login(page, env.E2E_USER_IDENTIFIER!, env.E2E_USER_PASSWORD!);

  const routineTitle = `E2E Dashboard ${Date.now()}`;
  const taskTitle = 'E2E dashboard task';

  await page.getByRole('button', { name: 'Nueva rutina' }).click();
  await page.getByPlaceholder('Ej: Mañana enfocada').fill(routineTitle);
  await page.getByPlaceholder('Ej: Tomar agua').first().fill(taskTitle);
  await page.getByRole('button', { name: 'Crear rutina' }).click();

  await expect(page.getByRole('button', { name: routineTitle }).first()).toBeVisible();

  // Creating a routine auto-selects it, so the analytics section below should already be
  // scoped to it once we scroll it into view.
  const analyticsRoutineSelect = page.getByLabel('Rutina para analíticas');
  await expect(analyticsRoutineSelect).toHaveValue(/.+/);
  await expect(analyticsRoutineSelect).toBeVisible();

  // Whether the compliance chart is already "unlocked" depends on whether this account has
  // ANY completion history at all (its gating is account-wide, not per-routine), so a brand new
  // routine shows either the generic empty state or its own "0 completed" counter.
  await expect(
    page
      .getByText('Aún no hay tareas completadas para graficar', { exact: false })
      .or(page.getByText(/^0 completed • 0 uncompleted/)),
  ).toBeVisible();

  const checkbox = page.locator('label', { hasText: taskTitle }).locator('input[type="checkbox"]');
  await checkbox.click();
  // The checkbox is React-controlled and only flips once the real PATCH round trip to Supabase
  // resolves, so this needs to poll rather than assume an instant DOM update like check() does.
  await expect(checkbox).toBeChecked({ timeout: 10000 });

  // The store optimistically appends a completion event on toggle, so the chart should reflect
  // the real completion immediately, without a page reload.
  await expect(page.getByText(/^1 completed • 0 uncompleted/)).toBeVisible();
});
