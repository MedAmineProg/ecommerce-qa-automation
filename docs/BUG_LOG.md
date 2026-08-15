# Bug Log

Real issues found while building and running this suite against
automationexercise.com. Kept here rather than only in code comments so
they're easy to reference in an interview or PR discussion.

---

## BUG-001: `searchProduct` API matches on category, not just product name

- **Severity**: Low
- **Found in**: `POST /api/searchProduct`
- **Steps to reproduce**:
  1. `POST https://automationexercise.com/api/searchProduct` with
     `search_product=top`.
  2. Inspect the returned `products` array.
- **Expected result**: Given the parameter name (`search_product`) and the
  UI's product-name search box, a caller would reasonably expect results
  where the *product name* contains "top".
- **Actual result**: The response includes products such as "Little Girls
  Mr. Panda Shirt" and "Colour Blocked Shirt – Sky Blue" — neither name
  contains "top" anywhere. They're returned because their *category* is
  "Tops & Shirts". The match is silently OR'd across name and category with
  no way to tell from the response which field matched.
- **Environment**: Verified directly via `request.post` (Playwright API
  request context), independent of any browser — Chromium, Firefox, WebKit
  all hit the same backend, so this isn't a browser-specific finding.
- **Notes**: Not necessarily wrong behaviour, but it's undocumented and
  inconsistent with how the parameter name reads. An API consumer filtering
  or displaying "matched on: <name>" would show incorrect results. Our test
  (`tests/api/products-api.spec.ts`) now asserts against this actual
  behaviour (name OR category contains the term) instead of the
  name-only assumption we started with, which failed on first run.

---

## BUG-002: Payment page ships a "success" message that a real submission never shows

- **Severity**: Low
- **Found in**: `/payment` (checkout flow)
- **Steps to reproduce**:
  1. View source of the `/payment` page while logged in with items in cart.
  2. Note the markup: `<div id="success_message" class="form-group hide">
     <div class="alert-success alert">Your order has been placed
     successfully!</div></div>`.
  3. Complete a real payment submission via the "Pay and Confirm Order"
     button.
- **Expected result**: Given the markup, a reasonable assumption (and what
  the original version of this suite's `CheckoutPage` was written against)
  is that the alert becomes visible in place after an AJAX-style submit.
- **Actual result**: Submitting the form does a full page navigation to
  `/payment_done/<order_id>`, a different page entirely, showing an "Order
  Placed!" heading and a different confirmation paragraph. The
  `#success_message` div's text is never actually rendered to a real user —
  it's dead markup, likely left over from an earlier AJAX-based
  implementation that was replaced with a full-page redirect.
- **Environment**: Chromium, Firefox, WebKit, Playwright 1.48,
  automationexercise.com.
- **Notes**: This only surfaces by reading the page source *and* observing
  actual runtime navigation — a test written from the static HTML alone
  (as this suite originally was) reasonably targets the wrong text and
  fails, even though checkout genuinely succeeds. Fixed in
  `src/pages/CheckoutPage.ts` to assert on the real post-redirect heading.

---

## BUG-003: Cart quantity has no in-page way to be edited

- **Severity**: Low / UX
- **Found in**: `/view_cart`
- **Steps to reproduce**:
  1. Add a product to the cart.
  2. Open the cart page and look at the "Quantity" column.
- **Expected result**: Most cart UIs render quantity as an editable input
  or +/− stepper, since changing quantity without removing and re-adding
  the item is a standard e-commerce expectation.
- **Actual result**: The quantity cell is a `<button class="disabled">2</button>`
  — a disabled button styled to look like a field, not an editable control.
  The only way to change quantity is to delete the line item and re-add the
  product the desired number of times (each "Add to cart" click while the
  item is already present increments it by one).
- **Environment**: Chromium, Firefox, WebKit, automationexercise.com.
- **Notes**: Confirmed by reading the live DOM (`.cart_quantity button`,
  not `.cart_quantity input` as originally assumed) — the original
  `CartPage` locator targeted a nonexistent `input`, which is what
  surfaced this during the first live run.

---

## Related: shared-target test infrastructure note

Not a site bug, but worth recording alongside these: automationexercise.com
is a shared public practice site, not a dedicated/isolated test
environment. Running this suite with high parallelism (8 workers on a
16-core dev machine) reliably caused requests to hang server-side past a
30s test timeout, even though nothing was actually broken — dropping to 2
workers (`playwright.config.ts`) made every run pass cleanly, repeatedly.
Documented here because it materially shaped the config, not because it's
a defect in the site itself.
