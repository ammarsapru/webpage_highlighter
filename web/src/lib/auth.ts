import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "hlx_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET env var is not set");
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function createSessionCookieValue(): string {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `${expiresAt}`;
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

function isValidSessionValue(value: string | undefined): boolean {
  if (!value) return false;
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return false;
  if (!safeEqual(sign(payload), sig)) return false;
  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  return true;
}

export async function hasValidSession(): Promise<boolean> {
  const store = await cookies();
  return isValidSessionValue(store.get(SESSION_COOKIE)?.value);
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
export const SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;

export function checkDashboardPassword(password: string): boolean {
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected) throw new Error("DASHBOARD_PASSWORD env var is not set");
  return safeEqual(password, expected);
}

// ---- Extension API token ----

export function hashApiToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateApiToken(): string {
  return `whx_${randomBytes(24).toString("base64url")}`;
}

export async function getSettings() {
  const existing = await prisma.settings.findUnique({ where: { id: 1 } });
  return existing;
}

/** Generates a brand new API token, persists its hash, and returns the plaintext (shown once). */
export async function rotateApiToken(): Promise<string> {
  const token = generateApiToken();
  const apiTokenHash = hashApiToken(token);
  await prisma.settings.upsert({
    where: { id: 1 },
    update: { apiTokenHash },
    create: { id: 1, apiTokenHash },
  });
  return token;
}

export async function isValidApiToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const settings = await getSettings();
  if (!settings?.apiTokenHash) return false;
  return safeEqual(hashApiToken(token), settings.apiTokenHash);
}

function extractBearerToken(request: Request): string | undefined {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return undefined;
  return header.slice("Bearer ".length).trim();
}

/** Authorizes a request from either the dashboard (session cookie) or the extension (bearer token). */
export async function requireAuth(request: Request): Promise<boolean> {
  if (await hasValidSession()) return true;
  const token = extractBearerToken(request);
  return isValidApiToken(token);
}

/** Authorizes dashboard-only actions (session cookie only, no extension token). */
export async function requireSession(): Promise<boolean> {
  return hasValidSession();
}

/** For use at the top of protected server-rendered dashboard pages. */
export async function requireSessionOrRedirect(): Promise<void> {
  if (!(await hasValidSession())) {
    redirect("/login");
  }
}
