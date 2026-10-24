/**
 * Starts the GitHub OAuth login for Decap CMS (Cloudflare Pages Function).
 * Requires GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in the Pages environment.
 * The default scope only grants access to public repositories; set GITHUB_SCOPE=repo
 * if the repository is private.
 */
export async function onRequest({ request, env }) {
  const origin = new URL(request.url).origin;
  const state = crypto.randomUUID();

  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  authorize.searchParams.set("redirect_uri", `${origin}/api/callback`);
  authorize.searchParams.set("scope", env.GITHUB_SCOPE ?? "public_repo");
  authorize.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorize.toString(),
      "Set-Cookie": `decap_oauth_state=${state}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
}
