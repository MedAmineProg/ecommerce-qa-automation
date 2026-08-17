import { test, expect } from '../../src/fixtures/pageFixtures';
import { createNewUser } from '../../src/data/testDataFactory';

test.describe('Authentication', () => {
  test('[TC-104] a new user can sign up successfully', async ({ homePage, loginPage, signupPage, page }) => {
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

  test('signing up with an email that already exists is rejected', async ({
    homePage,
    loginPage,
    signupPage,
    page,
  }) => {
    // The site has no seeded/known account to test against, and there's no
    // way to pre-register one out of band — so this test registers its own
    // user first, logs out, then re-attempts signup with that same email.
    const user = createNewUser();

    await homePage.open();
    await homePage.goToLogin();
    await loginPage.startSignup(user.name, user.email);
    await signupPage.completeAccountInfo(user.account);
    await expect(signupPage.accountCreatedBanner).toBeVisible();
    await signupPage.confirmAndContinue();
    await expect(page.getByText(`Logged in as ${user.name}`)).toBeVisible();

    await page.getByRole('link', { name: /logout/i }).click();
    await homePage.goToLogin();
    await loginPage.startSignup(user.name, user.email);

    await expect(loginPage.signupErrorMessage).toBeVisible();
  });
});
