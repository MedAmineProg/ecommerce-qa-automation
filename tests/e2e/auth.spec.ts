import { test, expect } from '../../src/fixtures/pageFixtures';
import { createNewUser } from '../../src/data/testDataFactory';

test.describe('Authentication', () => {
  test('a new user can sign up successfully', async ({ homePage, loginPage, signupPage, page }) => {
    const user = createNewUser();

    await homePage.open();
    await homePage.goToLogin();
    await loginPage.startSignup(user.name, user.email);

    await expect(page.getByText('ENTER ACCOUNT INFORMATION')).toBeVisible();
    await signupPage.completeAccountInfo(user.account);

    await expect(signupPage.accountCreatedBanner).toBeVisible();
    await signupPage.confirmAndContinue();

    await expect(page.getByText(`Logged in as ${user.name}`)).toBeVisible();
  });

  test('logging in with an unregistered email shows an error', async ({ homePage, loginPage }) => {
    await homePage.open();
    await homePage.goToLogin();

    await loginPage.login('not-a-real-user@example.com', 'wrongPassword123');

    await expect(loginPage.loginErrorMessage).toBeVisible();
  });

  test('signing up with an email that already exists is rejected', async ({ homePage, loginPage }) => {
    // Relies on a stable, pre-existing account. Swap for a seeded test
    // account rather than a hardcoded one if the suite grows beyond a demo.
    const existingEmail = 'existing.qa.demo.user@example.com';

    await homePage.open();
    await homePage.goToLogin();
    await loginPage.startSignup('Existing User', existingEmail);

    await expect(loginPage.signupErrorMessage).toBeVisible();
  });
});
