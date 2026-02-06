import { expect, test } from '@playwright/test'

function hasRealBackendEnv() {
  return Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY)
}

async function login(page: import('@playwright/test').Page, identifier: string, password: string) {
  await page.goto('/login')
  await page.getByTestId('login-identifier').fill(identifier)
  await page.getByTestId('login-password').fill(password)
  await page.getByTestId('login-submit').click()
  await expect(page).toHaveURL(/\/app/)
}

test('authenticated happy path: create routine + tasks and complete one task', async ({ page }) => {
  test.skip(!hasRealBackendEnv(), 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable real backend E2E')
  test.skip(
    !process.env.E2E_USER_IDENTIFIER || !process.env.E2E_USER_PASSWORD,
    'Set E2E_USER_IDENTIFIER and E2E_USER_PASSWORD to enable this test',
  )

  await login(page, process.env.E2E_USER_IDENTIFIER!, process.env.E2E_USER_PASSWORD!)

  const routineTitle = `E2E Routine ${Date.now()}`
  const task1 = 'E2E Task 1'
  const task2 = 'E2E Task 2'

  await page.getByRole('button', { name: 'Nueva rutina' }).click()

  await page.getByPlaceholder('Ej: Mañana enfocada').fill(routineTitle)

  // First task row.
  await page.getByPlaceholder('Ej: Tomar agua').first().fill(task1)

  // Add second row.
  await page.getByRole('button', { name: '+ Tarea' }).click()
  await page.getByPlaceholder('Ej: Tomar agua').nth(1).fill(task2)
  await page.getByPlaceholder('Ej: 2 litros').nth(1).fill('desc')

  await page.locator('input[type="date"]').nth(1).fill('2025-01-05')
  await page.locator('input[type="time"]').nth(1).fill('08:00')

  await page.getByRole('button', { name: 'Crear rutina' }).click()

  // Routine should be visible in the routines list.
  await expect(page.getByRole('button', { name: routineTitle })).toBeVisible()

  // Tasks should be visible.
  await expect(page.getByText(task1, { exact: true })).toBeVisible()
  await expect(page.getByText(task2, { exact: true })).toBeVisible()

  // Complete one task.
  const checkbox = page.locator('label', { hasText: task1 }).locator('input[type="checkbox"]')
  await checkbox.check()
  await expect(checkbox).toBeChecked()
})

test('RLS isolation (optional): user B cannot see user A routine', async ({ page }) => {
  test.skip(!hasRealBackendEnv(), 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable real backend E2E')
  test.skip(
    !process.env.E2E_USER_A_IDENTIFIER ||
      !process.env.E2E_USER_A_PASSWORD ||
      !process.env.E2E_USER_B_IDENTIFIER ||
      !process.env.E2E_USER_B_PASSWORD,
    'Set E2E_USER_A_IDENTIFIER/PASSWORD and E2E_USER_B_IDENTIFIER/PASSWORD to enable this test',
  )

  const routineTitle = `E2E RLS ${Date.now()}`

  // Login as user A and create a routine.
  await login(page, process.env.E2E_USER_A_IDENTIFIER!, process.env.E2E_USER_A_PASSWORD!)
  await page.getByRole('button', { name: 'Nueva rutina' }).click()
  await page.getByPlaceholder('Ej: Mañana enfocada').fill(routineTitle)
  await page.getByRole('button', { name: 'Crear rutina' }).click()

  await expect(page.getByRole('button', { name: routineTitle })).toBeVisible()

  // Sign out.
  await page.getByRole('button', { name: 'Salir' }).click()
  await expect(page).toHaveURL(/\/$/)

  // Login as user B and verify the routine is not visible.
  await login(page, process.env.E2E_USER_B_IDENTIFIER!, process.env.E2E_USER_B_PASSWORD!)

  // Ensure routines are loaded (button becomes enabled).
  await expect(page.getByRole('button', { name: 'Refrescar' })).toBeEnabled()

  await expect(page.getByRole('button', { name: routineTitle })).toHaveCount(0)
})
