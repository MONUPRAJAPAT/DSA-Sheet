import { expect, test } from '@playwright/test';

/**
 * The core promise of the assessment (PDF §6): a ticked problem is persisted and the student
 * resumes exactly where they left off on the next login.
 */
test('progress persists across logout / login and the student can resume', async ({ page }) => {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.dev`;
  const password = 'Passw0rd!';

  // Register
  await page.goto('/register');
  await page.getByLabel('Full name').fill('E2E Student');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  // Brand-new students get onboarding and a "Start here" pointer to the first problem.
  await expect(page.getByText('Getting started')).toBeVisible();
  await expect(page.getByText('Start here')).toBeVisible();

  // Open a chapter and tick the first problem
  await page.goto('/sheet/arrays');
  const checkbox = page.getByRole('checkbox', {
    name: /Mark Remove Duplicates from Sorted Array as solved/,
  });
  await checkbox.click();
  await expect(
    page.getByRole('checkbox', { name: /Remove Duplicates from Sorted Array as not solved/ }),
  ).toBeChecked();
  await expect(page.getByText('1/8')).toBeVisible();
  await expect(page.getByText('Your first problem — great start!')).toBeVisible();

  // Log out
  await page.getByRole('button').filter({ hasText: /^ES$/ }).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/login/);

  // Log back in → progress is still there and "continue" moved to the next problem
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText('Continue where you left off')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Move Zeroes' })).toBeVisible();
  await page.goto('/sheet/arrays');
  await expect(
    page.getByRole('checkbox', { name: /Remove Duplicates from Sorted Array as not solved/ }),
  ).toBeChecked();

  // A full reload restores the session from the httpOnly refresh cookie
  await page.reload();
  await expect(
    page.getByRole('checkbox', { name: /Remove Duplicates from Sorted Array as not solved/ }),
  ).toBeChecked();
});

test('the demo student can open the standalone study calendar', async ({ page }) => {
  await page.goto('/login');
  await page
    .getByRole('button', { name: /demo account/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto('/calendar');
  await expect(page.getByRole('heading', { name: 'Study Calendar' })).toBeVisible();
  await expect(page.locator('.fc')).toBeVisible();
  await expect(page.getByRole('button', { name: /plan/i }).first()).toBeVisible();
});
