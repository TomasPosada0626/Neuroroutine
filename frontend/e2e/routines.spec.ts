import { expect, test } from '@playwright/test';
import { env } from 'node:process';

function hasRealBackendEnv() {
  return Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY);
}

async function getSupabaseAccessToken(
  page: import('@playwright/test').Page,
): Promise<string | null> {
  return page.evaluate(() => {
    const keys = Object.keys(localStorage).filter((k) => k.includes('auth-token'));
    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as
          | { access_token?: string; currentSession?: { access_token?: string } }
          | Array<{ access_token?: string }>;

        if (typeof (parsed as { access_token?: string }).access_token === 'string') {
          return (parsed as { access_token: string }).access_token;
        }

        if (
          typeof (parsed as { currentSession?: { access_token?: string } }).currentSession
            ?.access_token === 'string'
        ) {
          return (parsed as { currentSession: { access_token: string } }).currentSession
            .access_token;
        }

        if (Array.isArray(parsed) && typeof parsed[0]?.access_token === 'string') {
          return parsed[0].access_token;
        }
      } catch {
        // ignore parsing errors and continue scanning
      }
    }

    return null;
  });
}

async function attemptCrossUserMutation(
  page: import('@playwright/test').Page,
  params: { routineTitle: string; taskTitle: string },
) {
  const token = await getSupabaseAccessToken(page);
  expect(token).not.toBeNull();

  const url = env.VITE_SUPABASE_URL!;
  const anonKey = env.VITE_SUPABASE_ANON_KEY!;

  return page.evaluate(
    async ({ supabaseUrl, supabaseAnonKey, accessToken, routineTitle, taskTitle }) => {
      const patchRes = await fetch(
        `${supabaseUrl}/rest/v1/routines?title=eq.${encodeURIComponent(routineTitle)}`,
        {
          method: 'PATCH',
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify({ notes: 'cross-user-mutation-attempt' }),
        },
      );

      const deleteRes = await fetch(
        `${supabaseUrl}/rest/v1/routine_tasks?title=eq.${encodeURIComponent(taskTitle)}`,
        {
          method: 'DELETE',
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${accessToken}`,
            Prefer: 'return=representation',
          },
        },
      );

      const patchBody = await patchRes.text();
      const deleteBody = await deleteRes.text();

      const parseRows = (raw: string) => {
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed.length : 0;
        } catch {
          return 0;
        }
      };

      return {
        patchStatus: patchRes.status,
        deleteStatus: deleteRes.status,
        patchRows: parseRows(patchBody),
        deleteRows: parseRows(deleteBody),
      };
    },
    {
      supabaseUrl: url,
      supabaseAnonKey: anonKey,
      accessToken: token!,
      routineTitle: params.routineTitle,
      taskTitle: params.taskTitle,
    },
  );
}

async function logout(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Salir' }).click();
  await expect(page).toHaveURL(/\/$/);
  // Belt and suspenders: sign-out navigates away before the Supabase network call resolves,
  // so a fast enough re-login could still race a lingering session token in storage. Clearing
  // storage directly guarantees the next login() starts from a truly clean slate regardless of
  // that timing, since these tests reuse a single page/browser context across both accounts.
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

async function login(page: import('@playwright/test').Page, identifier: string, password: string) {
  await page.goto('/login');
  await page.getByTestId('login-identifier').fill(identifier);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  // Real sign-in against a live Supabase project: password grant + profile sync are two
  // sequential network round trips before the redirect fires, plus dev-server cold-start
  // compilation on the first hit. The 5s default expect timeout is too tight for that.
  await expect(page).toHaveURL(/\/app/, { timeout: 15000 });
}

test('authenticated happy path: create routine + tasks and complete one task', async ({ page }) => {
  test.skip(
    !hasRealBackendEnv(),
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable real backend E2E',
  );
  test.skip(
    !env.E2E_USER_IDENTIFIER || !env.E2E_USER_PASSWORD,
    'Set E2E_USER_IDENTIFIER and E2E_USER_PASSWORD to enable this test',
  );

  await login(page, env.E2E_USER_IDENTIFIER!, env.E2E_USER_PASSWORD!);

  const routineTitle = `E2E Routine ${Date.now()}`;
  const task1 = 'E2E Task 1';
  const task2 = 'E2E Task 2';

  await page.getByRole('button', { name: 'Nueva rutina' }).click();

  await page.getByPlaceholder('Ej: Mañana enfocada').fill(routineTitle);

  // First task row.
  await page.getByPlaceholder('Ej: Tomar agua').first().fill(task1);

  // Add second row.
  await page.getByRole('button', { name: '+ Tarea' }).click();
  await page.getByPlaceholder('Ej: Tomar agua').nth(1).fill(task2);
  await page.getByPlaceholder('Ej: 2 litros').nth(1).fill('desc');

  await page.locator('input[type="date"]').nth(1).fill('2025-01-05');
  await page.locator('input[type="time"]').nth(1).fill('08:00');

  await page.getByRole('button', { name: 'Crear rutina' }).click();

  // Routine should be visible somewhere on the dashboard (the routine title also appears
  // inline inside other widgets, e.g. a task card showing which routine it belongs to, so a
  // strict single-match assertion would be ambiguous; existence anywhere is what matters here).
  await expect(page.getByRole('button', { name: routineTitle }).first()).toBeVisible();

  // Tasks should be visible (task titles can legitimately render in more than one widget,
  // e.g. also inside the "today focus" list, so match existence rather than a single element).
  await expect(page.getByText(task1, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(task2, { exact: true }).first()).toBeVisible();

  // Complete one task. The checkbox is React-controlled and only flips once the real PATCH
  // round trip to Supabase resolves, so click() + a polling assertion is used instead of
  // check(), which verifies the state change immediately after the click and doesn't wait
  // for that async update.
  const checkbox = page.locator('label', { hasText: task1 }).locator('input[type="checkbox"]');
  await checkbox.click();
  await expect(checkbox).toBeChecked({ timeout: 10000 });
});

// Both tests below log in against the SAME two real accounts (E2E_USER_IDENTIFIER as "user A",
// E2E_USER_B_IDENTIFIER as "user B") and mutate their routines. Running them concurrently
// (Playwright's default) caused resource contention on
// CI (2 Chromium instances + 2 concurrent Supabase round trips on a 2-core runner) severe
// enough to blow the 30s login timeout, and risks one test's writes leaking into the other's
// assertions. Force them to run one after another instead.
test.describe.serial('RLS regression (shared accounts)', () => {
  // Up to 3 real logins per test (each with a password grant + profile sync round trip) plus
  // routine/task CRUD and REST mutation attempts; the 30s default is too tight for that much
  // real network I/O against a live Supabase project.
  test.describe.configure({ timeout: 60000 });

  test('RLS isolation (optional): user B cannot see user A routine', async ({ page }) => {
    test.skip(
      !hasRealBackendEnv(),
      'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable real backend E2E',
    );
    test.skip(
      !env.E2E_USER_IDENTIFIER ||
        !env.E2E_USER_PASSWORD ||
        !env.E2E_USER_B_IDENTIFIER ||
        !env.E2E_USER_B_PASSWORD,
      'Set E2E_USER_IDENTIFIER/PASSWORD and E2E_USER_B_IDENTIFIER/PASSWORD to enable this test',
    );

    const routineTitle = `E2E RLS ${Date.now()}`;

    // Login as user A and create a routine.
    await login(page, env.E2E_USER_IDENTIFIER!, env.E2E_USER_PASSWORD!);
    await page.getByRole('button', { name: 'Nueva rutina' }).click();
    await page.getByPlaceholder('Ej: Mañana enfocada').fill(routineTitle);
    await page.getByRole('button', { name: 'Crear rutina' }).click();

    await expect(page.getByRole('button', { name: routineTitle }).first()).toBeVisible();

    // Sign out.
    await logout(page);

    // Login as user B and verify the routine is not visible.
    await login(page, env.E2E_USER_B_IDENTIFIER!, env.E2E_USER_B_PASSWORD!);

    // Ensure routines are loaded (button becomes enabled).
    await expect(page.getByRole('button', { name: 'Refrescar' })).toBeEnabled();

    // No `.first()` here on purpose: a leak into ANY widget on the page should fail this.
    await expect(page.getByRole('button', { name: routineTitle })).toHaveCount(0);
  });

  test('RLS mutation denial: user B cannot edit or delete user A data', async ({ page }) => {
    test.skip(
      !hasRealBackendEnv(),
      'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable real backend E2E',
    );
    test.skip(
      !env.E2E_USER_IDENTIFIER ||
        !env.E2E_USER_PASSWORD ||
        !env.E2E_USER_B_IDENTIFIER ||
        !env.E2E_USER_B_PASSWORD,
      'Set E2E_USER_IDENTIFIER/PASSWORD and E2E_USER_B_IDENTIFIER/PASSWORD to enable this test',
    );

    const routineTitle = `E2E RLS MUT ${Date.now()}`;
    const taskTitle = `E2E RLS TASK ${Date.now()}`;

    await login(page, env.E2E_USER_IDENTIFIER!, env.E2E_USER_PASSWORD!);

    await page.getByRole('button', { name: 'Nueva rutina' }).click();
    await page.getByPlaceholder('Ej: Mañana enfocada').fill(routineTitle);
    await page.getByPlaceholder('Ej: Tomar agua').first().fill(taskTitle);
    await page.getByRole('button', { name: 'Crear rutina' }).click();

    await expect(page.getByRole('button', { name: routineTitle }).first()).toBeVisible();
    await expect(page.getByText(taskTitle, { exact: true }).first()).toBeVisible();

    await logout(page);

    await login(page, env.E2E_USER_B_IDENTIFIER!, env.E2E_USER_B_PASSWORD!);

    await expect(page.getByRole('button', { name: routineTitle })).toHaveCount(0);

    const mutation = await attemptCrossUserMutation(page, { routineTitle, taskTitle });

    expect([200, 204]).toContain(mutation.patchStatus);
    expect([200, 204]).toContain(mutation.deleteStatus);
    expect(mutation.patchRows).toBe(0);
    expect(mutation.deleteRows).toBe(0);

    await logout(page);

    await login(page, env.E2E_USER_IDENTIFIER!, env.E2E_USER_PASSWORD!);
    await expect(page.getByRole('button', { name: routineTitle }).first()).toBeVisible();
    await expect(page.getByText(taskTitle, { exact: true }).first()).toBeVisible();
  });
});

test('offline cycle (optional): create local task, reconnect and sync', async ({ page }) => {
  test.skip(
    !hasRealBackendEnv(),
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable real backend E2E',
  );
  test.skip(
    !env.E2E_USER_IDENTIFIER || !env.E2E_USER_PASSWORD,
    'Set E2E_USER_IDENTIFIER and E2E_USER_PASSWORD to enable this test',
  );

  await login(page, env.E2E_USER_IDENTIFIER!, env.E2E_USER_PASSWORD!);

  const routineTitle = `E2E Offline ${Date.now()}`;
  const offlineTaskTitle = `Offline task ${Date.now()}`;

  await page.getByRole('button', { name: 'Nueva rutina' }).click();
  await page.getByPlaceholder('Ej: Mañana enfocada').fill(routineTitle);
  await page.getByRole('button', { name: 'Crear rutina' }).click();
  await expect(page.getByRole('button', { name: routineTitle }).first()).toBeVisible();

  await page.context().setOffline(true);

  await page.getByPlaceholder('Nueva tarea (paso pequeño)…').fill(offlineTaskTitle);
  // exact: true to disambiguate from the "Añadir varias" bulk-mode toggle button, which also
  // matches a substring name search for "Añadir".
  await page.getByRole('button', { name: 'Añadir', exact: true }).click();
  await expect(page.getByText(offlineTaskTitle, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/modo offline/i)).toBeVisible();

  await page.context().setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));

  await expect(page.getByText(/modo offline/i)).toHaveCount(0);
  await expect(page.getByText(offlineTaskTitle, { exact: true }).first()).toBeVisible();
});
