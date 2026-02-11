# Mobile Responsiveness E2E Tests

This directory contains comprehensive mobile responsiveness testing for the GrandCafe Cheers Management Platform.

## Quick Start

### Run All Mobile Tests
```bash
cd ../../
pnpm test:e2e tests/e2e/mobile-responsiveness.spec.ts
```

### Run Mobile Devices Only (Faster)
```bash
pnpm test:e2e tests/e2e/mobile-responsiveness.spec.ts -- \
  --project="Mobile Chrome" --project="Mobile Safari"
```

### Interactive Testing
```bash
pnpm test:e2e:ui tests/e2e/mobile-responsiveness.spec.ts
```

### View Results
```bash
pnpm exec playwright show-report
```

## Files

### `mobile-responsiveness.spec.ts`
The main test suite with 170+ test cases covering:
- Login page on mobile
- Navigation responsiveness
- Modal and dialog usability
- Touch interactions
- Viewport and layout
- Performance metrics
- Form usability
- Image optimization
- Accessibility compliance
- Orientation changes
- Common mobile issues

### `mobile-helpers.ts`
Reusable utility functions for mobile testing:
```typescript
import {
  isMobileViewport,
  expectTouchTargetSize,
  expectNoHorizontalScroll,
  expectFastPageLoad,
  fillFormMobile,
  testOrientationChange,
} from './mobile-helpers'
```

## Test Coverage

| Category | Tests | Status |
|----------|-------|--------|
| Login Page | 5 | ✅ |
| Navigation | 3 | ✅ |
| Modals | 2 | ✅ |
| Touch | 3 | ✅ |
| Layout | 3 | ✅ |
| Performance | 3 | ✅ |
| Forms | 3 | ✅ |
| Media | 2 | ✅ |
| Accessibility | 3 | ✅ |
| Orientation | 1 | ✅ |
| Mobile Issues | 3 | ✅ |
| **Total** | **170+** | **✅** |

## Devices Tested

- **iPhone 12** - 390×844 (iOS Safari)
- **Pixel 5** - 393×851 (Android Chrome)
- **Desktop** - 1280×720 (Chrome, Firefox, Safari)

## Documentation

For detailed information, see:
- `../../MOBILE_TESTING.md` - Comprehensive guide
- `../../MOBILE_TEST_REPORT.md` - Test report
- `../../MOBILE_TESTING_QUICKSTART.md` - Quick start
- `../../QA_MOBILE_CHECKLIST.md` - QA checklist

## Using Test Helpers

Example:
```typescript
import { expectTouchTargetSize, expectNoHorizontalScroll } from './mobile-helpers'

test('my test', async ({ page }) => {
  await page.goto('/login')

  // Verify touch targets
  await expectTouchTargetSize(page, 'button[type="submit"]')

  // Check no horizontal scroll
  await expectNoHorizontalScroll(page)
})
```

## Common Commands

```bash
# Run specific category
pnpm test:e2e tests/e2e/mobile-responsiveness.spec.ts -- --grep "Login"

# Run on specific device
pnpm test:e2e tests/e2e/mobile-responsiveness.spec.ts -- --project="Mobile Chrome"

# Run with debugging
pnpm test:e2e tests/e2e/mobile-responsiveness.spec.ts -- --debug

# Update snapshots
pnpm test:e2e tests/e2e/mobile-responsiveness.spec.ts -- --update-snapshots
```

## Need Help?

1. Check `MOBILE_TESTING.md` for comprehensive guide
2. Review test code comments
3. Run tests with `--debug` flag
4. Use `pnpm test:e2e:ui` for interactive testing
5. Check Playwright docs: https://playwright.dev

## Test Metrics

Each test validates:
- ✅ Element visibility and accessibility
- ✅ Touch target sizing (WCAG standards)
- ✅ No horizontal scrolling
- ✅ Text readability (font size)
- ✅ Page load performance
- ✅ Responsive layout
- ✅ Keyboard accessibility
- ✅ Screen reader compatibility

## CI/CD Integration

Tests run automatically on:
- Every commit (if configured)
- Before deployment
- Manual trigger for verification

Expected duration:
- Mobile only: 2-3 minutes
- All profiles: 15-20 minutes

## Troubleshooting

### Tests fail locally but pass in CI
- Check node/npm versions match CI
- Clear node_modules: `pnpm install --force`
- Increase timeout in playwright.config.ts

### Slow test execution
- Run mobile-only: `--project="Mobile Chrome" --project="Mobile Safari"`
- Reduce retry count for local testing
- Check CPU/memory availability

### Touch simulation errors
- Tests use `.click()` not `.tap()` for broad compatibility
- Mobile profiles in playwright.config.ts enable touch support
- Use `hasTouch` context option if needed

See `MOBILE_TESTING.md` for more troubleshooting tips.

---

**Created:** February 7, 2025
**Tests:** 170+
**Status:** ✅ Ready to use
