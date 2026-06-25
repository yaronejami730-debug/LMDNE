import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "./db";

const SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";
const COOKIE = "session";

export type Session = { username: string; role: Role };

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("hex");
}

export function makeToken(s: Session): string {
  const payload = Buffer.from(`${s.username}|${s.role}`, "utf8").toString(
    "base64url"
  );
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string | undefined): Session | null {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  const expected = sign(payload);
  if (
    sig.length !== expected.length ||
    !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  )
    return null;
  const [username, role] = Buffer.from(payload, "base64url")
    .toString("utf8")
    .split("|");
  if (!username || (role !== "operator" && role !== "admin")) return null;
  return { username, role };
}

export async function getSession(): Promise<Session | null> {
  const c = await cookies();
  return verifyToken(c.get(COOKIE)?.value);
}

export async function setSession(s: Session) {
  const c = await cookies();
  c.set(COOKIE, makeToken(s), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 jours
  });
}

export async function clearSession() {
  const c = await cookies();
  c.delete(COOKIE);
}

// Redirige vers /login si pas connecté
export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

export const COOKIE_NAME = COOKIE;
