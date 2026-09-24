# Marketplace OS Web

Public Next.js frontend for Marketplace OS. It owns Cognito authorization-code PKCE, encrypted HTTP-only token cookies, the authenticated dashboard, and server-side API calls. Inventory intake previews CSV rows locally, persists a tenant-scoped server preview, requires a separate approval action, and displays serialized units linked to catalog SKUs. The Scan Reports page accepts paired WholeCell exports, shows a local parse preview, persists an explicit server preview, and saves an approved report snapshot with tenant-scoped history and filters; it does not mutate inventory. The Product Catalog page presents the supplied Device Mart WholeCell product-variation export as an authenticated, read-only snapshot, with search, filters, taxonomy views, and local CSV download. Its snapshot is returned only to authenticated members of the Device Mart tenant; CSV replacement uploads remain in the current browser session and do not write to the backend. Catalog creation, edits, and deletion are not implemented. WholeCell remains the source of truth. Google Drive search/grouping is paused; eBay draft/review and publishing are not implemented.

## Commands

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm build
pnpm dev
```

Required Vercel server environment values: `COGNITO_MANAGED_LOGIN_DOMAIN`, `COGNITO_WEB_CLIENT_ID`, `COGNITO_REDIRECT_URI`, `MARKETPLACE_API_ORIGIN`, and a random `SESSION_SECRET`. Do not use `NEXT_PUBLIC_` for these values. Backend work lives in the separate Marketplace OS backend repository.
