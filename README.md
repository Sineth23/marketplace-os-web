# Marketplace OS Web

Public Next.js frontend for Marketplace OS. It renders the workspace preview and owns Cognito authorization-code PKCE, encrypted HTTP-only token cookies, and the authenticated dashboard boundary.

## Commands

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm build
pnpm dev
```

Required Vercel server environment values: `COGNITO_MANAGED_LOGIN_DOMAIN`, `COGNITO_WEB_CLIENT_ID`, `COGNITO_REDIRECT_URI`, `MARKETPLACE_API_ORIGIN`, and a random `SESSION_SECRET`. Do not use `NEXT_PUBLIC_` for these values. Backend work lives in the separate Marketplace OS backend repository.
