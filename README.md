# Marketplace OS Web

The standalone Next.js frontend for Marketplace OS, deployed through Vercel. The backend lives in the separate `marketplace-os` repository; the two repositories communicate over HTTP and do not share packages or a lockfile.

## What lives here

- Cognito authorization-code PKCE sign-in and encrypted, HTTP-only session cookies.
- The authenticated dashboard and tenant-facing workflows.
- Server-side API calls that pass the session access token to the backend. Browser code does not receive the backend token, database credentials, or provider secrets.
- UI-only placeholders for features that are not connected to a backend yet.

### Integrations

`/dashboard/integrations` is the authenticated integrations directory. It shows the current Google Drive connection status, links to the WholeCell inventory CSV workflow, and identifies eBay as a UI preview. The Google Drive status uses the existing authenticated tenant API endpoint; the backend checks current membership for that organization read.

The eBay account summary and Details, Listings, and Listing Opportunities views are at `/dashboard/integrations/ebay`. An organization owner can start seller OAuth from Details. The page then reads the linked eBay username and read-only Inventory API item/offer records through the authenticated backend. Listing matching uses exact SKU against up to 500 tenant-authorized WholeCell catalog records; the opportunities view shows unmatched WholeCell SKUs as candidates, not eligibility decisions. Seller Hub/Trading listings outside eBay's Inventory API model may not appear. Order import, listing writes, stock synchronization, and automation remain unavailable. WholeCell remains the source of truth. Setup is documented in the backend repository's `docs/integrations/ebay.md` and `docs/exec-plans/ebay-seller-connection.md`.

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
