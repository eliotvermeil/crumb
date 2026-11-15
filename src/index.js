import { onRequest } from "../functions/api.js";

/* Point d'entrée Cloudflare Workers :
   /api -> serveur Crumb ; /u/<pseudo> -> l'app avec un aperçu de partage ; le reste -> fichiers du site (public/) */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;
    if (pathname === "/api") return onRequest({ request, env, ctx });
    const m = pathname.match(/^\/u\/([A-Za-z0-9_]{3,20})\/?$/);
    if (m) {
      const r = await env.ASSETS.fetch(new Request(new URL("/", url), { headers: request.headers }));
      const u = m[1].toLowerCase();
      const tags =
        `<meta property="og:title" content="@${u} sur Crumb"><meta property="og:description" content="Rejoins @${u} sur Crumb : le carnet de restos entre amis.">` +
        `<meta property="og:image" content="${url.origin}/icon-512.png"><meta property="og:type" content="website"><meta name="twitter:card" content="summary">`;
      const html = (await r.text()).replace(/<title>[^<]*<\/title>/, `<title>@${u} sur Crumb</title>`).replace("</head>", tags + "</head>");
      const h = new Headers(r.headers);
      h.delete("content-length");
      h.set("content-type", "text/html; charset=utf-8");
      h.set("cache-control", "no-cache");
      return new Response(html, { status: 200, headers: h });
    }
    return env.ASSETS.fetch(request);
  },
};
