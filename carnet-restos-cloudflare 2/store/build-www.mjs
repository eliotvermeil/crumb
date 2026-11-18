// Prépare le dossier "www" pour Capacitor (apps iOS / Android).
// Usage : SITE_URL=https://ton-site.netlify.app node store/build-www.mjs
import { cpSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
const site = (process.env.SITE_URL || "").replace(/\/$/, "");
if (!/^https:\/\//.test(site)) { console.error("Indique SITE_URL, par exemple : SITE_URL=https://ton-site.netlify.app"); process.exit(1); }
rmSync("www", { recursive: true, force: true }); mkdirSync("www");
for (const f of ["index.html", "legal.html", "legal.js", "i18n.js", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png", "apple-touch-icon.png"]) cpSync(f, "www/" + f);
cpSync("vendor", "www/vendor", { recursive: true });
writeFileSync("www/config.js", `window.CRUMB_API_BASE=${JSON.stringify(site)};\n`);
console.log("www prêt, API :", site);
