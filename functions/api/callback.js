/**
 * Finishes the GitHub OAuth login and hands the token to the Decap CMS window
 * that opened this popup, using Decap's postMessage handshake.
 */
export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const cookieState = request.headers.get("Cookie")?.match(/decap_oauth_state=([\w-]+)/)?.[1];

  if (!cookieState || cookieState !== url.searchParams.get("state")) {
    return reply("error", { message: "Ongeldige inlogpoging, probeer het opnieuw." });
  }

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code: url.searchParams.get("code"),
    }),
  });
  const result = await response.json();

  if (result.error || !result.access_token) {
    return reply("error", { message: result.error_description ?? "Inloggen bij GitHub is mislukt." });
  }
  return reply("success", { token: result.access_token, provider: "github" });
}

function reply(status, content) {
  // Escape "<" so the JSON can't close the <script> element.
  const message = JSON.stringify(`authorization:github:${status}:${JSON.stringify(content)}`).replace(/</g, "\\u003c");
  const html = `<!doctype html><html><body><script>
    window.addEventListener("message", function receive(event) {
      if (event.origin !== window.location.origin) return;
      window.opener.postMessage(${message}, event.origin);
      window.removeEventListener("message", receive);
    });
    window.opener.postMessage("authorizing:github", window.location.origin);
  </script></body></html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Set-Cookie": "decap_oauth_state=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
    },
  });
}
