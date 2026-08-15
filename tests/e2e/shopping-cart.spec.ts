import { test, expect } from '../../src/fixtures/pageFixtures';

test.describe('Shopping cart', () => {
  test('adding a product from the products page updates the cart', async ({
    productsPage,
    cartPage,
    page,
  }) => {
    await productsPage.open();
    await productsPage.addFirstResultToCart();

    // site shows a modal after add-to-cart; follow through to the cart
    await page.getByRole('link', { name: 'View Cart' }).click();

    await expect(cartPage.cartRows).toHaveCount(1);
  });

  test('removing the only item in the cart shows the empty-cart state', async ({
    productsPage,
    cartPage,
    page,
  }) => {
    await productsPage.open();
    await productsPage.addFirstResultToCart();
    await page.getByRole('link', { name: 'View Cart' }).click();

    await cartPage.removeItem(0);

    await expect(cartPage.emptyCartMessage).toBeVisible();
  });

  test('cart persists the correct quantity for a repeated add', async ({
    productsPage,
    cartPage,
    page,
  }) => {
    await productsPage.open();
    await productsPage.addFirstResultToCart();
    await page.getByRole('link', { name: 'Continue Shopping' }).click();
    await productsPage.addFirstResultToCart();
    await page.getByRole('link', { name: 'View Cart' }).click();

    // Adding the same product twice should increase quantity, not create
    // a duplicate row — a common real-world edge case worth locking down.
    await expect(cartPage.cartRows).toHaveCount(1);
    await expect(cartPage.cartRows.first().locator('.cart_quantity input')).toHaveValue('2');
  });
});
