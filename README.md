# Marketplace OS Web

The standalone Next.js frontend for Marketplace OS, deployed through Vercel. The backend lives in the separate `marketplace-os` repository; the two repositories communicate over HTTP and do not share packages or a lockfile.

## What lives here

- Cognito authorization-code PKCE sign-in and encrypted, HTTP-only session cookies.
- The authenticated dashboard and tenant-facing workflows.
- Server-side API calls that pass the session access token to the backend. Browser code does not receive the backend token, database credentials, or provider secrets.
- UI-only placeholders for features that are not connected to a backend yet.

### Current eBay preview

`/dashboard/integrations` is a WholeCell-inspired UI preview on the `codex/fix-product-catalog-tenant-name` feature branch. It includes an account summary, Details, Listings, and Listing Opportunities views. The summary reads the selected member's catalog-SKU and serialized-unit totals through existing authenticated API routes. The backend checks membership on each tenant read.

No eBay account or listing data is available to this page. It says “Not connected,” renders empty listing tables instead of sample rows, and disables the configuration and import controls. It makes no eBay requests and does not create listings, import orders, or synchronize stock. WholeCell remains the source of truth. See the backend repository's `docs/ONBOARDING.md` and `docs/exec-plans/ebay-integration-mimic.md` for the cross-repository flow and future prerequisites.

### Other data boundaries

- Inventory CSV intake shows a local parse, persists a tenant-scoped server preview, and requires a separate approval action before inventory changes.
- Scan Reports accepts paired WholeCell exports, persists a preview, and saves an approved tenant-scoped report snapshot. It does not mutate inventory.
- Product Catalog displays an authenticated read-only Device Mart WholeCell snapshot. Browser-session CSV replacement does not write to the backend; catalog create/edit/delete are not implemented.
- Google Drive photo search and grouping are paused for feature work.

## Local commands

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm check
pnpm build
```

Required Vercel server environment values are `COGNITO_MANAGED_LOGIN_DOMAIN`, `COGNITO_WEB_CLIENT_ID`, `COGNITO_REDIRECT_URI`, `MARKETPLACE_API_ORIGIN`, and a random `SESSION_SECRET`. Keep them server-side; do not use `NEXT_PUBLIC_` for these values.
