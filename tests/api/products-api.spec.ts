import { test, expect } from '@playwright/test';
import { env } from '../../src/config/env';

/**
 * API-level tests hitting automationexercise.com's public practice API
 * directly, independent of the UI layer. Keeping these separate from the
 * E2E specs means they run fast and can catch backend regressions before
 * a UI test would even get there.
 */
test.describe('Products API', () => {
  test('GET productsList returns 200 with a product array', async ({ request }) => {
    const response = await request.get(`${env.apiBaseUrl}/productsList`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body.products)).toBe(true);
    expect(body.products.length).toBeGreaterThan(0);
  });

  test('POST productsList is rejected — the endpoint is read-only', async ({ request }) => {
    const response = await request.post(`${env.apiBaseUrl}/productsList`);
    const body = await response.json();

    expect(body.responseCode).toBe(405);
    expect(body.message).toContain('not supported');
  });

  test('searchProduct returns matching results for a known term', async ({ request }) => {
    const response = await request.post(`${env.apiBaseUrl}/searchProduct`, {
      form: { search_product: 'top' },
    });
    const body = await response.json();

    expect(response.status()).toBe(200);
    expect(body.products.length).toBeGreaterThan(0);

    // The search matches against category as well as product name (see
    // BUG-001 in docs/BUG_LOG.md) — e.g. "Little Girls Mr. Panda Shirt" is
    // returned for "top" because its category is "Tops & Shirts", even
    // though "top" doesn't appear in the product name itself. Asserting on
    // name-only containment would fail against the API's real behaviour.
    for (const product of body.products) {
      const matchesName = product.name.toLowerCase().includes('top');
      const matchesCategory = product.category?.category?.toLowerCase().includes('top') ?? false;
      expect(matchesName || matchesCategory).toBe(true);
    }
  });

  test('searchProduct without a search term returns a clear error', async ({ request }) => {
    const response = await request.post(`${env.apiBaseUrl}/searchProduct`, { form: {} });
    const body = await response.json();

    expect(body.responseCode).toBe(400);
    expect(body.message).toContain('search_product parameter is missing');
  });
});
