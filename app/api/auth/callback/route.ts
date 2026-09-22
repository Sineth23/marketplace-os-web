import { NextResponse } from "next/server";
import { finishSignIn } from "../../../../lib/auth";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state || !(await finishSignIn(code, state)))
    return NextResponse.redirect(new URL("/?signIn=failed", url));
  return NextResponse.redirect(new URL("/dashboard", url));
}
