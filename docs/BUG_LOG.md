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

## BUG-004: Zero-result search shows no "no products found" state

- **Severity**: Low / UX
- **Found in**: `/products?search=<term>` (product search)
- **Steps to reproduce**:
  1. Go to the Products page.
  2. Search for a term guaranteed not to match anything, e.g.
     `zzzxcvnonsensequery12345`.
- **Expected result**: Some explicit feedback that the search ran and
  found nothing — an empty-state message, an illustration, anything that
  distinguishes "zero results" from "the page is still loading" or "the
  page is broken".
- **Actual result**: The page renders the "Searched Products" heading with
  an entirely empty grid underneath it. There is no "No products found",
  no result count, no empty-state messaging of any kind — the only signal
  that the search completed successfully is the *absence* of product
  tiles.
- **Environment**: Chromium, Firefox, WebKit, automationexercise.com.
- **Notes**: Confirmed by inspecting the live DOM after a genuinely
  unmatched search — there's no hidden "no-results" element that merely
  needs a CSS class flipped; the markup for that state simply doesn't
  exist. `tests/e2e/product-search.spec.ts` asserts on the heading (proof
  the search executed) plus zero tiles (proof of no matches), since that's
  the only verifiable signal the site actually gives.

---

## BUG-005: Payment form silently accepts an obviously invalid card number

- **Severity**: Medium
- **Found in**: `/payment` (checkout flow)
- **Steps to reproduce**:
  1. Reach the payment step of checkout with a product in the cart.
  2. Fill in all fields with valid-looking values except card number,
     which gets `123`.
  3. Submit via "Pay and Confirm Order".
- **Expected result**: Some client- or server-side pushback on a 3-digit
  "card number" — even a fake/dummy payment gateway typically validates
  numeric length or a Luhn checksum before accepting.
- **Actual result**: The order is placed successfully — same
  `/payment_done/<id>` "Order Placed!" flow as a real card number. The
  only validation on this form is the browser's native `required`
  attribute (blocks *empty* fields — see the passing half of
  `checkout.spec.ts`'s new sad-path test); there is no format or length
  validation on card number, CVC, or expiry at all once a field is
  non-empty.
- **Environment**: Chromium, Firefox, WebKit, automationexercise.com.
- **Notes**: This is the more interesting half of the "invalid payment
  details" investigation — an empty card number is correctly blocked
  (native HTML5 validation, verified across all three engines), but a
  present-and-wrong one sails through untouched. Not asserted as a test
  failure here since accepting *some* junk value is arguably intended
  behaviour for a dummy training gateway with no real payment processor
  behind it, but it's exactly the kind of gap a real payment integration
  would need to close, so it's recorded here rather than silently
  discovered and dropped.

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
