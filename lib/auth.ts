import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const sessionCookieName = "marketplace_os_session";
const pkceCookieName = "marketplace_os_pkce";
type OAuthConfiguration = Readonly<{
  clientId: string;
  domain: string;
  redirectUri: string;
  apiOrigin: string;
}>;
type Session = Readonly<{ accessToken: string; refreshToken: string; expiresAt: number }>;
type PkceTransaction = Readonly<{ state: string; verifier: string }>;

function environment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}
function encryptionKey(): Buffer {
  return createHash("sha256").update(environment("SESSION_SECRET")).digest();
}
function seal(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(Buffer.from(JSON.stringify(value))), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}
function unseal<T>(value: string): T | undefined {
  try {
    const payload = Buffer.from(value, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), payload.subarray(0, 12));
    decipher.setAuthTag(payload.subarray(12, 28));
    return JSON.parse(
      Buffer.concat([decipher.update(payload.subarray(28)), decipher.final()]).toString("utf8"),
    ) as T;
  } catch {
    return undefined;
  }
}
export function oauthConfiguration(): OAuthConfiguration {
  const domain = environment("COGNITO_MANAGED_LOGIN_DOMAIN");
  const redirectUri = environment("COGNITO_REDIRECT_URI");
  const apiOrigin = environment("MARKETPLACE_API_ORIGIN");
  if (
    !domain.startsWith("https://") ||
    !redirectUri.startsWith("https://") ||
    !apiOrigin.startsWith("https://")
  )
    throw new Error("Cognito and API configuration must use HTTPS origins.");
  return { clientId: environment("COGNITO_WEB_CLIENT_ID"), domain, redirectUri, apiOrigin };
}
export async function beginSignIn(): Promise<string> {
  const configuration = oauthConfiguration();
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  (await cookies()).set(pkceCookieName, seal({ state, verifier } satisfies PkceTransaction), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth",
    maxAge: 600,
  });
  const url = new URL("/oauth2/authorize", configuration.domain);
  for (const [key, value] of Object.entries({
    client_id: configuration.clientId,
    response_type: "code",
    redirect_uri: configuration.redirectUri,
    scope: "openid email profile",
    state,
    code_challenge_method: "S256",
    code_challenge: challenge,
  }))
    url.searchParams.set(key, value);
  return url.toString();
}
export async function finishSignIn(code: string, state: string): Promise<boolean> {
  const cookieStore = await cookies();
  const transaction = unseal<PkceTransaction>(cookieStore.get(pkceCookieName)?.value ?? "");
  cookieStore.delete(pkceCookieName);
  if (!transaction || !timingSafeEqual(Buffer.from(transaction.state), Buffer.from(state))) return false;
  const configuration = oauthConfiguration();
  const response = await fetch(new URL("/oauth2/token", configuration.domain), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: configuration.clientId,
      code,
      redirect_uri: configuration.redirectUri,
      code_verifier: transaction.verifier,
    }),
    cache: "no-store",
  });
  if (!response.ok) return false;
  const token = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!token.access_token || !token.refresh_token || typeof token.expires_in !== "number") return false;
  cookieStore.set(
    sessionCookieName,
    seal({
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: Date.now() + token.expires_in * 1000,
    } satisfies Session),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 604800,
    },
  );
  return true;
}
export async function session(): Promise<Session | undefined> {
  const value = (await cookies()).get(sessionCookieName)?.value;
  const result = value ? unseal<Session>(value) : undefined;
  return result && result.expiresAt > Date.now() ? result : undefined;
}
export async function signOut(): Promise<void> {
  (await cookies()).delete(sessionCookieName);
}
