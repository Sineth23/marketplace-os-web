# Marketplace OS Web

The standalone Next.js frontend for Marketplace OS, deployed through Vercel. The backend lives in the separate `marketplace-os` repository; the two repositories communicate over HTTP and do not share packages or a lockfile.

## What lives here

- Cognito authorization-code PKCE sign-in and encrypted, HTTP-only session cookies.
- The authenticated dashboard and tenant-facing workflows.
- Server-side API calls that pass the session access token to the backend. Browser code does not receive the backend token, database credentials, or provider secrets.
- UI-only placeholders for features that are not connected to a backend yet.

### Integrations

The authenticated integrations directory at /dashboard/integrations shows the current Google Drive connection status, links to the WholeCell inventory CSV workflow, and provides marketplace setup pages. The Google Drive status uses the existing authenticated tenant API endpoint; the backend checks current membership for that organization read. Amazon setup is a manual guide based on the portal state shared by the user; it does not call Amazon or connect a seller account.

The eBay account summary and Details, Listings, and Listing Opportunities views are at `/dashboard/integrations/ebay`. An organization owner can start seller OAuth from Details once the backend app is configured. The page then reads the linked eBay username and read-only Inventory API item/offer records through the authenticated backend. Listing matching uses exact SKU against up to 500 tenant-authorized Marketplace OS catalog records; only units reviewed as `available` count in the quantity comparison. The opportunities view shows unmatched available Marketplace OS SKUs as candidates, not eligibility decisions. Seller Hub/Trading listings outside eBay's Inventory API model may not appear. Order import, listing writes, stock synchronization, and automation remain unavailable. Marketplace OS owns internal inventory; WholeCell is an optional reviewed CSV source. Setup is documented in the backend repository's `docs/integrations/ebay.md` and `docs/exec-plans/ebay-seller-connection.md`.

The Amazon setup guide and Details, Listings, and Listing Opportunities views are at /dashboard/integrations/amazon. It reports the sandbox client and verification steps shared during onboarding as manual status, makes no Amazon API calls, and shows empty listing states until a public app and tenant seller authorization are available. Seller OAuth, live listing reads, order import, listing writes, and stock synchronization are not implemented.

Best Buy Marketplace and Reebelo partner setup guides are at /dashboard/integrations/bestbuy and /dashboard/integrations/reebelo. Each page includes Details, Listings, and Listing Opportunities views. Access status is explicitly unverified; the pages are static onboarding guides and display no live or sample seller data. Confirm current partner eligibility, documentation, authentication, and permitted reads with each provider before designing an API connection.

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

Best Buy and Reebelo logos are stored locally under public/integrations to keep the UI independent of third-party image hosts. Best Buy uses [the corporate logo download](https://corporate.bestbuy.com/best-buy-logo-4/); the Reebelo wordmark is copied from the [official homepage](https://reebelo.com/).
