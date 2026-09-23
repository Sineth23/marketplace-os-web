# Marketplace OS Web

Public Next.js frontend for Marketplace OS. It owns Cognito authorization-code PKCE, encrypted HTTP-only token cookies, the authenticated dashboard, and server-side API calls. Inventory intake now previews CSV rows locally, persists a tenant-scoped server preview, requires a separate approval action, and displays serialized units linked to catalog SKUs. WholeCell remains the source of truth. Google Drive search/grouping is paused; eBay draft/review and publishing are not implemented.

## Commands

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm build
pnpm dev
```

Required Vercel server environment values: `COGNITO_MANAGED_LOGIN_DOMAIN`, `COGNITO_WEB_CLIENT_ID`, `COGNITO_REDIRECT_URI`, `MARKETPLACE_API_ORIGIN`, and a random `SESSION_SECRET`. Do not use `NEXT_PUBLIC_` for these values. Backend work lives in the separate Marketplace OS backend repository.
