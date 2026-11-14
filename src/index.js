import { onRequest } from "../functions/api.js";

/* Point d'entrée Cloudflare Workers : /api -> serveur Crumb, le reste -> fichiers du site (public/) */
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api") return onRequest({ request, env });
    return env.ASSETS.fetch(request);
  },
};
