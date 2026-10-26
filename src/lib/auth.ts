export const AUTH_COOKIE = "jobpilot_auth";

/** Cookie value derived from APP_PASSWORD, so changing the password signs everyone out. */
export async function authToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`jobpilot:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
