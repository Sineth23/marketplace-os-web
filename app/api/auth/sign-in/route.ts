import { NextResponse } from "next/server";
import { beginSignIn } from "../../../../lib/auth";
export const runtime = "nodejs";
export async function GET() {
  return NextResponse.redirect(await beginSignIn());
}
