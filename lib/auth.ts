import { cookies } from "next/headers";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "edit_session";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

function authSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET is missing or too short. Set a long random string in .env.local.",
    );
  }
  return secret;
}

/** Opaque session token derived from the server secret. */
function sessionToken(): string {
  return createHmac("sha256", authSecret()).update("editor").digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** True when the request carries a valid editor session cookie. */
export async function isAuthed(): Promise<boolean> {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  if (!value) return false;
  try {
    return safeEqual(value, sessionToken());
  } catch {
    return false;
  }
}

/**
 * Verifies the PIN against EDIT_PIN_HASH (sha256). On success, sets a signed,
 * httpOnly session cookie and returns true.
 */
export async function signInWithPin(pin: string): Promise<boolean> {
  const expected = (process.env.EDIT_PIN_HASH || "").trim().toLowerCase();
  if (!expected) {
    throw new Error("EDIT_PIN_HASH is not set. Run `npm run pin:hash -- <pin>`.");
  }
  const provided = createHash("sha256").update(pin).digest("hex");
  if (!safeEqual(provided, expected)) return false;

  const store = await cookies();
  store.set(COOKIE_NAME, sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return true;
}

export async function signOut(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Throws if the caller is not an authenticated editor. Use in mutations. */
export async function requireEditor(): Promise<void> {
  if (!(await isAuthed())) {
    throw new Error("Unauthorized: editor session required.");
  }
}
