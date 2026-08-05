# E2E Challenge Detail Claim Mock Fix

## What failed

CI failed in `e2e/challenges.spec.ts` on the challenge detail test while waiting for `Моя заявка`.

## Root cause

`ChallengeDetailPage` now renders challenge submissions as live claim cards loaded from `achievements`. The existing e2e test mocked `challenge_entries` with `claim_id: c1`, but did not mock the linked `achievements` row.

Because no `achievements` data was returned, the page had no claim status for `c1`; the entry was filtered out by the live challenge visibility rule and `Моя заявка` was not rendered.

## Fix

Updated `e2e/challenges.spec.ts` to mock the linked `achievements` request for claim `c1`.

The mocked claim uses:

- `status: pending`
- `claim_angle: judge`
- `meta.challenge_id` pointing to the challenge
- `meta.source: challenge_entry`

This matches the current product rule: pending challenge claims are live and visible, rejected claims are hidden.

## Files changed

- `e2e/challenges.spec.ts`
- `report/e2e-challenge-detail-claim-mock-fix.md`

## Checks

- `npx playwright test e2e/challenges.spec.ts --project=chromium` — passed (`2` tests)
- `npx tsc --noEmit` — passed
- `npm run lint` — passed
- `npm run test` — passed (`58` files, `402` tests)
- `npm run build` — passed

Build notes:

- Existing Primer CSS `@position-try` warnings remain.
- Existing Vite large chunk warning remains.

## Scope confirmation

No product logic, DB schema, migrations, design system, reaction logic, or moderation behavior was changed.
