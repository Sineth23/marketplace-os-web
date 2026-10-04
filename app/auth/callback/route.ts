import { NextResponse } from "next/server";

// The deployed Cognito app client already allows this localhost callback path.
// Redirect into the session handler where the short-lived PKCE cookie is scoped.
export function GET(request: Request) {
  const target = new URL(request.url);
  target.pathname = "/api/auth/callback";
  return NextResponse.redirect(target);
}
