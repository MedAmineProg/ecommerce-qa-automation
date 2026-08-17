import { test, expect } from '../../src/fixtures/pageFixtures';

test.describe('Product search', () => {
  test('[TC-103] searching for a term with no matches shows zero results', async ({ productsPage }) => {
    await productsPage.open();
    await productsPage.search('zzzxcvnonsensequery12345');

    // The site has no explicit "no products found" message (see BUG-004 in
    // docs/BUG_LOG.md) — a zero-match search still renders the "Searched
    // Products" heading with an empty grid underneath. Asserting on the
    // heading confirms the search actually executed rather than the page
    // being stuck; asserting zero tiles confirms no results were returned.
    await expect(productsPage.searchedProductsHeading).toBeVisible();
    await expect(productsPage.productTiles).toHaveCount(0);
  });
});
