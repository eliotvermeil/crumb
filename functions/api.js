import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";

/* ---------- Stockage : Cloudflare D1 (même interface que Netlify Blobs) ----------
   Une seule table clé/valeur. Les grosses valeurs (photos) sont découpées en morceaux
   car D1 limite chaque ligne à 2 Mo. Les lectures faites en même temps sont regroupées
   en une seule requête SQL (le plan gratuit limite le nombre de requêtes par appel). */
const CH = 400000;
let ENV = null, READY = null;
class Store {
  constructor(db) { this.db = db; this.q = []; }
  async init() {
    if (!READY) READY = this.db.prepare("CREATE TABLE IF NOT EXISTS kv (k TEXT NOT NULL, i INTEGER NOT NULL, v TEXT NOT NULL, PRIMARY KEY (k, i))").run();
    await READY;
  }
  get(k, o) {
    return new Promise((res, rej) => {
      this.q.push({ k, json: !!(o && o.type === "json"), res, rej });
      if (this.q.length === 1) Promise.resolve().then(() => this.flush());
    });
  }
  async flush() {
    const q = this.q; this.q = [];
    try { await this.init(); } catch (e) { return q.forEach((x) => x.rej(e)); }
    const keys = [...new Set(q.map((x) => x.k))], rows = new Map();
    try {
      for (let s = 0; s < keys.length; s += 90) {
        const ks = keys.slice(s, s + 90);
        const r = await this.db.prepare("SELECT k, i, v FROM kv WHERE k IN (" + ks.map(() => "?").join(",") + ") ORDER BY k, i").bind(...ks).all();
        for (const x of r.results) rows.set(x.k, (rows.get(x.k) || "") + x.v);
      }
    } catch (e) { return q.forEach((x) => x.rej(e)); }
    for (const x of q) {
      const v = rows.get(x.k);
      if (v === undefined) { x.res(null); continue; }
      try { x.res(x.json ? JSON.parse(v) : v); } catch (e) { x.rej(e); }
    }
  }
  async set(k, v) {
    await this.init();
    v = String(v);
    const st = [this.db.prepare("DELETE FROM kv WHERE k = ?").bind(k)];
    for (let i = 0, n = 0; i < v.length || n === 0; i += CH, n++) st.push(this.db.prepare("INSERT INTO kv (k, i, v) VALUES (?, ?, ?)").bind(k, n, v.slice(i, i + CH)));
    await this.db.batch(st);
  }
  setJSON(k, v) { return this.set(k, JSON.stringify(v)); }
  async delete(k) { await this.init(); await this.db.prepare("DELETE FROM kv WHERE k = ?").bind(k).run(); }
  async list({ prefix = "" } = {}) {
    await this.init();
    const r = await this.db.prepare("SELECT DISTINCT k FROM kv WHERE k >= ? AND k < ?").bind(prefix, prefix + "\uffff").all();
    return { blobs: r.results.map((x) => ({ key: x.k })) };
  }
}

const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const nm = (s) => String(s || "").toLowerCase().trim();
/* Mot de passe : PBKDF2-SHA256, 100 000 itérations (WebCrypto natif, rapide sur Workers) */
const hash = async (p, salt) => {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(p)), "PBKDF2", false, ["deriveBits"]);
  return Buffer.from(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(String(salt)), iterations: 100000 }, k, 256));
};
const ck = (a, b) => "c/" + [a, b].sort().join("__");
const REACTS = ["❤️", "🔥", "🤤", "👀"];
const WEAK = new Set(["12345678", "123456789", "1234567890", "password", "motdepasse", "azertyui", "azerty123", "qwertyui", "00000000", "11111111", "password1"]);
const pwOk = (p, u) => String(p || "").length >= 8 && !WEAK.has(String(p).toLowerCase()) && nm(p) !== u;
const S = (v, n) => (typeof v === "string" ? v.slice(0, n) : "");
const N = (v, a, b) => { v = +v; return Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : 0; };
const url = (u) => (/^https?:\/\//.test(String(u || "")) ? String(u).slice(0, 300) : "");
const TOPC = new Map();
const rid = () => Date.now().toString(36) + randomBytes(2).toString("hex");

let SEC = "";
const secret = async (st) => {
  if (SEC) return SEC;
  let s = await st.get("secret");
  if (!s) { s = randomBytes(32).toString("hex"); await st.set("secret", s); }
  return (SEC = s);
};
const sign = (u, v, k) => {
  const b = Buffer.from(JSON.stringify({ u, v, e: Date.now() + 90 * 864e5 })).toString("base64url");
  return b + "." + createHmac("sha256", k).update(b).digest("base64url");
};
const check = (t, k) => {
  try {
    const [b, s] = String(t).split(".");
    const x = createHmac("sha256", k).update(b).digest("base64url");
    if (s.length !== x.length || !timingSafeEqual(Buffer.from(s), Buffer.from(x))) return null;
    const d = JSON.parse(Buffer.from(b, "base64url").toString());
    return d.e > Date.now() ? d : null;
  } catch { return null; }
};

/* validation stricte : on ne stocke que des champs connus, bornés */
function cleanItem(x) {
  if (!x || typeof x !== "object" || typeof x.id !== "string" || !/^[A-Za-z0-9_-]{1,40}$/.test(x.id)) return null;
  const o = { id: x.id, maj: N(x.maj, 0, 4e12) || Date.now(), nv: x.nv === 2 ? 2 : undefined };
  if (x.del) { o.del = 1; return o; }
  if (x.album) return { ...o, album: 1, nom: S(x.nom, 40), emoji: S(x.emoji, 8) };
  Object.assign(o, {
    nom: S(x.nom, 80), cuisine: S(x.cuisine, 30), ville: S(x.ville, 60), date: S(x.date, 10), avis: S(x.avis, 1000),
    lien: url(x.lien), note: Math.round(N(x.note, 0, 10) * 2) / 2, prix: Math.round(N(x.prix, 0, 1000)),
    pe: x.pe ? 1 : undefined, todo: x.todo ? true : undefined, geo: x.geo ? 1 : undefined,
    occ: Array.isArray(x.occ) ? x.occ.filter((k) => ["date","amis","famille","pro","solo","brunch"].includes(k)).slice(0, 6) : undefined, must: S(x.must, 80) || undefined,
    alb: Array.isArray(x.alb) ? x.alb.filter((a) => typeof a === "string").slice(0, 20).map((a) => a.slice(0, 40)) : undefined,
  });
  if (x.lat != null && x.lon != null && Math.abs(+x.lat) <= 90 && Math.abs(+x.lon) <= 180) { o.lat = +x.lat; o.lon = +x.lon; }
  const p = x.photo;
  if (typeof p === "string" && ((/^data:image\/(jpeg|webp|png);base64,/.test(p) && p.length < 150000) || (/^https:\/\//.test(p) && p.length < 400))) o.photo = p;
  return o.nom ? o : null;
}

/* ---------- Recommandations (OpenStreetMap, côté serveur) ---------- */
const UA = { "user-agent": "crumb/1.0 (app perso)" };
const jf = async (u, o = {}, ms = 5000) => {
  const r = await fetch(u, { ...o, headers: { ...UA, ...(o.headers || {}) }, signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
};
const MIR = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
const rich = (t) => ["website", "contact:website", "opening_hours", "phone", "contact:phone", "wheelchair", "addr:street"].filter((k) => t[k]).length;
async function reco(st, city, c, ll, rad, cc) {
  let lat, lon;
  if (ll) ({ lat, lon } = ll);
  else {
    const base = "https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1&accept-language=fr&q=" + encodeURIComponent(city);
    const pick = (r) => r && (r.find((x) => ["city", "town", "village", "municipality", "suburb", "borough", "county", "state"].includes(x.addresstype)) || r[0]);
    let g = null;
    if (cc && !city.includes(",")) g = pick(await jf(base + "&countrycodes=" + cc, {}, 3000).catch(() => null));
    if (!g) g = pick(await jf(base, {}, 3000).catch(() => null));
    if (!g) return J({ e: "Ville introuvable." }, 404);
    ({ lat, lon } = g);
  }
  const R = Math.min(Math.max(+rad || 4000, 300), 8000);
  const key = "rc/" + (+lat).toFixed(3) + "_" + (+lon).toFixed(3) + "/" + R + "/" + c.map((x) => x[0]).join("-");
  const hit = await st.get(key, { type: "json" }).catch(() => null);
  if (hit && Date.now() - hit.t < 432e5) return J({ items: hit.items });
  const q = "[out:json][timeout:5];(" + c.map((x) => `nwr["amenity"="restaurant"]["name"]["cuisine"~"${x[1]}"](around:${R},${lat},${lon});`).join("") + ");out center tags 150;";
  let els = null;
  try {
    const d = await Promise.any(MIR.map((m) => jf(m, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(q) }, 5500)));
    els = d.elements;
  } catch {}
  const out = [], seen = new Set();
  if (els) {
    c.forEach(([n, re]) => {
      const rx = new RegExp(re);
      els.filter((e) => e.tags && e.tags.name && rx.test(e.tags.cuisine || "")).sort((a, b) => rich(b.tags) - rich(a.tags)).slice(0, 12).forEach((e) => {
        const t = e.tags, k = n + t.name;
        if (seen.has(k)) return;
        seen.add(k);
        out.push({ nom: t.name, cuisine: n, ad: [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" "), site: url(t.website || t["contact:website"]), lat: e.lat ?? e.center?.lat ?? null, lon: e.lon ?? e.center?.lon ?? null });
      });
    });
  } else if (city) {
    await Promise.all(c.map(async ([n, re]) => {
      try {
        const r = await jf("https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=12&accept-language=fr&q=" + encodeURIComponent(re.split("|")[0] + " restaurant " + city), {}, 3000);
        r.filter((p) => p.category === "amenity" && p.type === "restaurant" && p.name).slice(0, 8).forEach((p) => {
          const a = p.address || {};
          out.push({ nom: p.name, cuisine: n, ad: [a.house_number, a.road].filter(Boolean).join(" "), site: "", lat: +p.lat, lon: +p.lon });
        });
      } catch {}
    }));
  }
  if (!out.length) return J({ e: els ? "Rien trouvé dans cette zone." : "Les services de cartes sont indisponibles. Réessaie dans un instant." }, els ? 404 : 503);
  if (els) await st.setJSON(key, { t: Date.now(), items: out }).catch(() => {});
  return J({ items: out });
}


/* ---------- Notifications push (Web Push, VAPID + chiffrement aes128gcm) ---------- */
const VAPID_PUB = "BPovVXPxhIZ_WX6Z4JyG1cZ_Pzqv1gvIZ5CPfkvz_tGk7PB9WSirQnU5eAvHlI71uWPzZqsq-OIcsxYoFUdKm7o";
const b64u = (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const cat = (...a) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };
const hk = async (salt, ikm, info, len) => {
  const k = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, k, len * 8));
};
async function pushOne(sub, payload) {
  const enc = new TextEncoder();
  const uaPub = unb64u(sub.keys.p256dh), auth = unb64u(sub.keys.auth);
  const eph = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", eph.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, eph.privateKey, 256));
  const ikm = await hk(auth, ecdh, cat(enc.encode("WebPush: info\0"), uaPub, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hk(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hk(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const ak = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, ak, cat(enc.encode(payload), new Uint8Array([2]))));
  const body = cat(salt, new Uint8Array([0, 0, 16, 0, 65]), asPub, ct);
  const pub = unb64u(VAPID_PUB);
  const jwk = { kty: "EC", crv: "P-256", d: ENV.VAPID_PRIVATE, x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)) };
  const sk = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const h = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" }))) + "." + b64u(enc.encode(JSON.stringify({ aud: new URL(sub.endpoint).origin, exp: Math.floor(Date.now() / 1000) + 43200, sub: ENV.VAPID_SUBJECT || "mailto:contact@crumb.app" })));
  const sig = b64u(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, sk, enc.encode(h)));
  const r = await fetch(sub.endpoint, { method: "POST", headers: { "content-encoding": "aes128gcm", "content-type": "application/octet-stream", ttl: "86400", urgency: "normal", authorization: `vapid t=${h}.${sig}, k=${VAPID_PUB}` }, body, signal: AbortSignal.timeout(4000) });
  return r.status;
}
async function pushTo(st, to, o) {
  if (!ENV.VAPID_PRIVATE) return;
  const k = "ps/" + to, subs = (await st.get(k, { type: "json" }).catch(() => null)) || [];
  if (!subs.length) return;
  const T = { req: ["Nouvelle demande d’ami", `@${o.u} veut devenir ton ami`], acc: ["Demande acceptée", `@${o.u} a accepté ta demande`], fol: ["Nouvel abonné", `@${o.u} s’est abonné à ton profil`], rx: ["Nouvelle réaction", `@${o.u} a réagi ${o.e || ""} à ${o.m || "ton resto"}`], cm: ["Nouveau commentaire", `@${o.u} : ${o.x || ""}`] }[o.ty] || ["Crumb", "Nouvelle activité"];
  const payload = JSON.stringify({ title: T[0], body: T[1], tag: o.ty });
  const keep = [];
  await Promise.all(subs.map(async (s) => { try { const c = await pushOne(s, payload); if (c !== 404 && c !== 410) keep.push(s); } catch { keep.push(s); } }));
  if (keep.length !== subs.length) await st.setJSON(k, keep).catch(() => {});
}

const handle = async (req) => {
  if (req.method !== "POST") return J({ e: "bad" }, 405);
  const raw = await req.text();
  if (raw.length > 6e6) return J({ e: "Requête trop volumineuse." }, 413);
  let B;
  try { B = JSON.parse(raw); } catch { return J({ e: "bad" }, 400); }
  if (!B || typeof B !== "object") return J({ e: "bad" }, 400);
  const st = new Store(ENV.DB);
  const { a, t, u, p, cg, cid, items, city, c, prof, msg, spot, al, e, id, nom, lat, lon, rad, since, after, users, min, q, v, old, pw, m } = B;
  const ip = (req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "?").split(",")[0].trim();
  const limit = async (key, max, win) => {
    const k = "rl/" + key, now = Date.now();
    let r = (await st.get(k, { type: "json" })) || { n: 0, t: now };
    if (now - r.t > win) r = { n: 0, t: now };
    r.n++;
    await st.setJSON(k, r);
    return r.n > max;
  };
  const TOO = () => J({ e: "Trop de tentatives. Réessaie dans quelques minutes." }, 429);

  if (a === "reco") {
    if (await limit("reco:" + ip, 40, 60000)) return TOO();
    const ok = Array.isArray(c) && c.length > 0 && c.length <= 8 && c.every((x) => Array.isArray(x) && /^[a-z|_-]{2,160}$/.test(x[1]) && typeof x[0] === "string" && x[0].length < 30);
    const ll = typeof lat === "number" && typeof lon === "number" && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;
    if (!ok || (!ll && (typeof city !== "string" || !city.trim() || city.length > 80))) return J({ e: "bad" }, 400);
    return reco(st, String(city || "").trim(), c, ll, rad, typeof B.cc === "string" && /^[a-z,]{2,40}$/.test(B.cc) ? B.cc : "");
  }

  const key = await secret(st);
  if (a === "signup" || a === "login") {
    const n = nm(u);
    if (!/^[a-z0-9_]{3,20}$/.test(n)) return J({ e: "Pseudo : 3 à 20 lettres, chiffres ou _." }, 400);
    if (a === "signup") {
      if (await limit("signup:" + ip, 10, 36e5)) return TOO();
      if (cg !== true) return J({ e: "Tu dois accepter les conditions d’utilisation et la politique de confidentialité." }, 400);
      if (!pwOk(p, n)) return J({ e: "Mot de passe : 8 caractères minimum, pas trop simple." }, 400);
      if (await st.get("u/" + n, { type: "json" })) return J({ e: "Ce pseudo existe déjà." }, 409);
      const salt = randomBytes(16).toString("hex");
      await st.setJSON("u/" + n, { salt, h: (await hash(p, salt)).toString("hex"), fr: [], rq: [], fo: [], tv: 0, nr: 0, pub: false, cg: Date.now(), cv: "2026-11" });
      return J({ t: sign(n, 0, key), u: n });
    }
    if ((await limit("lg:" + n + ":" + ip, 8, 9e5)) || (await limit("lgu:" + n, 25, 9e5))) return TOO();
    const cur = await st.get("u/" + n, { type: "json" });
    if (!cur || !timingSafeEqual(await hash(p || "", cur.salt), Buffer.from(cur.h, "hex"))) return J({ e: "Identifiants incorrects." }, 401);
    await st.delete("rl/lg:" + n + ":" + ip).catch(() => {});
    return J({ t: sign(n, cur.tv || 0, key), u: n });
  }

  const tk = check(t, key);
  const me = tk && tk.u;
  const self = me && (await st.get("u/" + me, { type: "json" }));
  if (!self || (tk.v || 0) !== (self.tv || 0)) return J({ e: "auth" }, 401);
  self.fo = self.fo || [];
  const saveU = (n, o) => st.setJSON("u/" + n, o);
  const data = async (n) => (await st.get("d/" + n, { type: "json" })) || [];
  const idx = async (n) => (await st.get("i/" + n, { type: "json" })) || (await data(n)).map(({ photo, ...r }) => r);
  const done = (l) => l.filter((x) => !x.del && !x.todo && !x.album);
  const pubs = async () => (await st.get("pubs", { type: "json" })) || [];
  const notify = async (to, o) => {
    const k = "nt/" + to, l = (await st.get(k, { type: "json" })) || [];
    l.unshift({ id: rid(), t: Date.now(), ...o });
    await st.setJSON(k, l.slice(0, 60));
    await pushTo(st, to, o).catch(() => {});
  };
  if (a === "psub") {
    const sb = B.sub;
    if (!sb || typeof sb.endpoint !== "string" || !/^https:\/\//.test(sb.endpoint) || sb.endpoint.length > 600 || !sb.keys || typeof sb.keys.p256dh !== "string" || typeof sb.keys.auth !== "string") return J({ e: "bad" }, 400);
    const k = "ps/" + me, l = ((await st.get(k, { type: "json" }).catch(() => null)) || []).filter((x) => x.endpoint !== sb.endpoint);
    l.unshift({ endpoint: sb.endpoint, keys: { p256dh: sb.keys.p256dh, auth: sb.keys.auth } });
    await st.setJSON(k, l.slice(0, 5));
    return J({ ok: 1, srv: !!ENV.VAPID_PRIVATE });
  }
  if (a === "pdel") {
    const k = "ps/" + me, ep = B.endpoint;
    await st.setJSON(k, ((await st.get(k, { type: "json" }).catch(() => null)) || []).filter((x) => x.endpoint !== ep));
    return J({ ok: 1 });
  }
  const ibGet = async (n) => (await st.get("ib/" + n, { type: "json" })) || { t: {} };
  const blk = async (n) => (self.bl || []).includes(n) || (((await st.get("u/" + n, { type: "json" })) || {}).bl || []).includes(me);
  const canSee = async (n) => n === me || (!(await blk(n)) && (self.fr.includes(n) || (await pubs()).includes(n)));
  const kill = async (n) => {
    self.fr = self.fr.filter((x) => x !== n); self.fo = (self.fo || []).filter((x) => x !== n); self.rq = self.rq.filter((x) => x !== n);
    const o = await st.get("u/" + n, { type: "json" });
    if (o) { o.fr = (o.fr || []).filter((x) => x !== me); o.fo = (o.fo || []).filter((x) => x !== me); o.rq = (o.rq || []).filter((x) => x !== me); await saveU(n, o); }
    await st.delete(ck(me, n)).catch(() => {});
    const ib = await ibGet(n); delete ib.t[me]; await st.setJSON("ib/" + n, ib);
    const im = await ibGet(me); delete im.t[n]; await st.setJSON("ib/" + me, im);
    await saveU(me, self);
  };
  const accept = async (n, o) => {
    self.rq = self.rq.filter((x) => x !== n);
    if (!self.fr.includes(n)) self.fr.push(n);
    if (o && !o.fr.includes(me)) o.fr.push(me);
    await saveU(me, self);
    if (o) { await saveU(n, o); await notify(n, { ty: "acc", u: me }); }
  };
  const nv = (x) => (x.nv === 2 ? x.note : (x.note || 0) * 2);

  if (a === "load") {
    const all = await data(me), s = +since || 0;
    return J({ items: s ? all.filter((x) => (x.sv || 0) > s) : all, ts: Date.now(), prof: await st.get("p/" + me, { type: "json" }) });
  }
  if (a === "save") {
    if (!Array.isArray(items) || items.length > 40) return J({ e: "bad" }, 400);
    if (await limit("save:" + me, 90, 60000)) return TOO();
    const cur = await data(me), mp = new Map(cur.map((x) => [x.id, x])), now = Date.now();
    for (const raw2 of items) {
      const x = cleanItem(raw2);
      if (!x) continue;
      const o = mp.get(x.id);
      if (!o || (x.maj || 0) >= (o.maj || 0)) mp.set(x.id, { ...x, sv: now });
    }
    for (const [k, x] of mp) if (x.del && now - (x.maj || 0) > 90 * 864e5) mp.delete(k);
    const list = [...mp.values()].slice(0, 3000);
    await st.setJSON("d/" + me, list);
    await st.setJSON("i/" + me, list.filter((x) => !x.del).map(({ photo, ...r }) => r));
    return J({ ok: 1, ts: now, n: list.length });
  }
  if (a === "pset") {
    const ok = (x, mx) => x === undefined || x === "" || (typeof x === "string" && x.startsWith("data:image/") && x.length < mx);
    if (!prof || !ok(prof.avatar, 150000) || !ok(prof.banner, 400000) || !Array.isArray(prof.favs || [])) return J({ e: "bad" }, 400);
    await st.setJSON("p/" + me, { avatar: prof.avatar || "", banner: prof.banner || "", favs: (prof.favs || []).slice(0, 4).map((x) => String(x).slice(0, 40)), maj: +prof.maj || Date.now() });
    return J({ ok: 1 });
  }

  /* ----- notifications / pulse léger ----- */
  if (a === "pulse") {
    const [nt, ib] = await Promise.all([st.get("nt/" + me, { type: "json" }), ibGet(me)]);
    return J({ rq: self.rq.length, nt: (nt || []).filter((x) => x.t > (self.nr || 0)).length, un: Object.values(ib.t).reduce((s, x) => s + (x.un || 0), 0) });
  }
  if (a === "nt") return J({ list: (await st.get("nt/" + me, { type: "json" })) || [], nr: self.nr || 0 });
  if (a === "ntread") { self.nr = Date.now(); await saveU(me, self); return J({ ok: 1 }); }

  /* ----- amis, abonnements, activité ----- */
  if (a === "social") {
    const P = await pubs();
    const srcs = [...self.fr.map((n) => [n, "f"]), ...self.fo.filter((n) => P.includes(n) && !self.fr.includes(n)).map((n) => [n, "o"])].slice(0, 24);
    const [lists, rxs, cms, ib, nt] = await Promise.all([
      Promise.all(srcs.map(async ([n]) => done(await idx(n)))),
      Promise.all(srcs.map(([n]) => st.get("rx/" + n, { type: "json" }))),
      Promise.all(srcs.map(([n]) => st.get("cm/" + n, { type: "json" }))),
      ibGet(me), st.get("nt/" + me, { type: "json" }),
    ]);
    const feed = srcs
      .flatMap(([n, k], i) => lists[i].map((x) => ({ u: n, k, id: x.id, nom: x.nom, cuisine: x.cuisine, ville: x.ville, note: x.note, nv: x.nv, prix: x.prix || 0, avis: S(x.avis, 200), lien: url(x.lien), lat: x.lat ?? null, lon: x.lon ?? null, maj: x.maj || 0, rx: (rxs[i] || {})[x.id] || {}, cn: ((cms[i] || {})[x.id] || []).length })))
      .sort((x, y) => y.maj - x.maj).slice(0, 30);
    const threads = Object.entries(ib.t).filter(([n]) => self.fr.includes(n)).map(([n, x]) => ({ u: n, from: x.from, ts: x.ts, m: x.m, un: x.un || 0 }));
    return J({ fr: self.fr, rq: self.rq, fo: self.fo, pub: !!self.pub, feed, threads, myrx: (await st.get("rx/" + me, { type: "json" })) || {}, nt: (nt || []).filter((x) => x.t > (self.nr || 0)).length });
  }
  if (a === "add") {
    const n = nm(u);
    const o = n && n !== me ? await st.get("u/" + n, { type: "json" }) : null;
    if (!o) return J({ e: "Pseudo introuvable." }, 404);
    if (await blk(n)) return J({ e: "Pseudo introuvable." }, 404);
    if (self.fr.includes(n)) return J({ e: "Vous êtes déjà amis." }, 409);
    if (await limit("add:" + me, 30, 36e5)) return TOO();
    if (self.rq.includes(n)) await accept(n, o);
    else if (!o.rq.includes(me)) { o.rq.push(me); await saveU(n, o); await notify(n, { ty: "req", u: me }); }
    return J({ ok: 1 });
  }
  if (a === "acc") {
    const n = nm(u);
    if (!self.rq.includes(n)) return J({ e: "bad" }, 400);
    await accept(n, await st.get("u/" + n, { type: "json" }));
    return J({ ok: 1 });
  }
  if (a === "unfriend") { await kill(nm(u)); return J({ ok: 1 }); }
  if (a === "dec") { self.rq = self.rq.filter((x) => x !== nm(u)); await saveU(me, self); return J({ ok: 1 }); }
  if (a === "block") {
    const n = nm(u);
    if (!n || n === me) return J({ e: "bad" }, 400);
    self.bl = [...new Set([...(self.bl || []), n])].slice(-200);
    await kill(n);
    return J({ ok: 1 });
  }
  if (a === "unblock") { self.bl = (self.bl || []).filter((x) => x !== nm(u)); await saveU(me, self); return J({ ok: 1 }); }
  if (a === "blocks") return J({ list: self.bl || [] });
  if (a === "report") {
    if (await limit("rp:" + me, 10, 36e5)) return TOO();
    const n = nm(u);
    if (!n || n === me) return J({ e: "bad" }, 400);
    await st.setJSON("rp/" + Date.now() + "-" + rid(), { t: Date.now(), by: me, u: n, id: S(id, 40), nom: S(nom, 80), why: S(v, 40), m: S(m, 300) });
    return J({ ok: 1 });
  }
  if (a === "setpub") {
    self.pub = !!v;
    await saveU(me, self);
    let P = await pubs();
    P = P.filter((x) => x !== me);
    if (self.pub) P.push(me);
    await st.setJSON("pubs", P.slice(-5000));
    return J({ ok: 1, pub: self.pub });
  }
  if (a === "users") {
    const s = nm(q);
    if (s.length < 2) return J({ list: [] });
    return J({ list: (await pubs()).filter((x) => x !== me && x.includes(s)).slice(0, 10) });
  }
  if (a === "follow" || a === "unfollow") {
    const n = nm(u);
    if (a === "unfollow") { self.fo = self.fo.filter((x) => x !== n); await saveU(me, self); return J({ ok: 1 }); }
    if (!(await pubs()).includes(n) || n === me || (await blk(n))) return J({ e: "Ce profil n’est pas public." }, 404);
    if (!self.fo.includes(n)) { self.fo = [...self.fo, n].slice(-100); await saveU(me, self); await notify(n, { ty: "fol", u: me }); }
    return J({ ok: 1 });
  }
  if (a === "view") {
    const n = nm(u);
    if (n === me || !(await canSee(n))) return J({ e: "Ce profil n’est pas accessible." }, 403);
    return J({ items: done(await data(n)), prof: await st.get("p/" + n, { type: "json" }), friend: self.fr.includes(n), following: self.fo.includes(n) });
  }
  if (a === "fmap") {
    const P = await pubs();
    const pool = [...self.fr, ...self.fo.filter((n) => P.includes(n))];
    const sel = Array.isArray(users) && users.length ? users.map(nm).filter((n) => pool.includes(n)) : pool;
    const mn = N(min, 0, 10), out = [];
    const lists = await Promise.all(sel.slice(0, 24).map(async (n) => done(await idx(n)).filter((x) => nv(x) >= mn).map((x) => ({ u: n, id: x.id, nom: x.nom, cuisine: x.cuisine, ville: x.ville, note: nv(x), avis: S(x.avis, 160), lien: url(x.lien), lat: x.lat ?? null, lon: x.lon ?? null, prix: x.prix || 0 }))));
    for (const l of lists) out.push(...l);
    out.sort((x, y) => y.note - x.note);
    return J({ items: out.slice(0, 400), who: pool });
  }
  if (a === "top") {
    if (await limit("top:" + me, 12, 60000)) return TOO();
    const la = +lat, lo = +lon, R = Math.min(Math.max(+rad || 1000, 200), 20000);
    if (!Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) return J({ items: [] });
    const r2 = (d) => (d * Math.PI) / 180;
    const hv = (x, y) => { const h = Math.sin(r2(x - la) / 2) ** 2 + Math.cos(r2(la)) * Math.cos(r2(x)) * Math.sin(r2(y - lo) / 2) ** 2; return 12742000 * Math.asin(Math.sqrt(h)); };
    const scan = async (pool, g) => {
      for (let i = 0; i < pool.length; i += 40) {
        const chunk = await Promise.all(pool.slice(i, i + 40).map(async (n) => done(await idx(n))));
        for (const l of chunk) for (const x of l) {
          if (x.lat == null || x.lon == null || !(nv(x) > 0) || Math.abs(+x.lat) > 90 || Math.abs(+x.lon) > 180 || hv(+x.lat, +x.lon) > R) continue;
          const k = String(x.nom || "").toLowerCase().trim(); if (!k) continue;
          const e = g.get(k) || { nom: S(x.nom, 80), cuisine: S(x.cuisine, 30), ville: S(x.ville, 60), lat: +x.lat, lon: +x.lon, sum: 0, n: 0 };
          e.sum += nv(x); e.n++; g.set(k, e);
        }
      }
      return g;
    };
    /* agrégat des profils publics : mis en cache 5 min par zone (ne contient aucun pseudo) */
    const ck2 = [la.toFixed(2), lo.toFixed(2), R].join(), hit = TOPC.get(ck2);
    const P = await pubs();
    let base;
    if (hit && Date.now() - hit.t < 3e5) base = hit.g;
    else {
      base = await scan(P.slice(-300), new Map());
      if (TOPC.size > 150) TOPC.clear();
      TOPC.set(ck2, { t: Date.now(), g: base });
    }
    const g = new Map([...base].map(([k, v]) => [k, { ...v }]));
    const bad = new Set(self.bl || []);
    const priv = self.fr.filter((n) => !P.includes(n) && !bad.has(n)).slice(0, 40);
    await scan(priv, g);
    const out = [...g.values()].map((e) => ({ nom: e.nom, cuisine: e.cuisine, ville: e.ville, lat: e.lat, lon: e.lon, note: Math.round((e.sum / e.n) * 10) / 10, n: e.n })).sort((x, y) => y.note - x.note || y.n - x.n).slice(0, 60);
    return J({ items: out, pub: P.includes(me) });
  }
  if (a === "board") {
    const yr = String(new Date().getFullYear());
    const names = [me, ...self.fr].slice(0, 25);
    const rows = await Promise.all(names.map(async (n) => {
      const l = done(await idx(n)), r = l.filter((x) => nv(x) > 0);
      return { u: n, n: l.length, c: new Set(l.map((x) => x.cuisine)).size, y: l.filter((x) => String(x.date || "").startsWith(yr)).length, avg: r.length ? Math.round((r.reduce((s, x) => s + nv(x), 0) / r.length) * 10) / 10 : 0 };
    }));
    return J({ rows: rows.sort((x, y) => y.n - x.n || y.c - x.c) });
  }
  if (a === "fon") {
    const s = String(nom || "").toLowerCase().trim();
    if (!s) return J({ list: [] });
    const P = await pubs();
    const pool = [...self.fr, ...self.fo.filter((n) => P.includes(n))].slice(0, 30);
    const lists = await Promise.all(pool.map(async (n) => done(await idx(n)).filter((x) => String(x.nom).toLowerCase().trim() === s).map((x) => ({ u: n, id: x.id, note: x.note, nv: x.nv, avis: S(x.avis, 300), date: x.date }))));
    return J({ list: lists.flat() });
  }

  /* ----- messagerie ----- */
  if (a === "chat") {
    const n = nm(u);
    if (!self.fr.includes(n) || (await blk(n))) return J({ e: "Vous n’êtes pas amis." }, 403);
    const all = (await st.get(ck(me, n), { type: "json" })) || [], ib = await ibGet(me);
    if (ib.t[n] && ib.t[n].un) { ib.t[n].un = 0; await st.setJSON("ib/" + me, ib); }
    return J({ msgs: after ? all.filter((x) => x.t > +after) : all });
  }
  if (a === "send") {
    const n = nm(u);
    if (!self.fr.includes(n)) return J({ e: "Vous n’êtes pas amis." }, 403);
    if (await limit("send:" + me, 40, 60000)) return TOO();
    const text = S(msg, 500).trim();
    const s = spot && typeof spot.nom === "string" && spot.nom
      ? { nom: spot.nom.slice(0, 80), cuisine: S(spot.cuisine, 30), ville: S(spot.ville, 60), lien: url(spot.lien), lat: +spot.lat || null, lon: +spot.lon || null, note: N(spot.note, 0, 10) }
      : null;
    const al0 = al && typeof al.nom === "string" && al.nom && Array.isArray(al.spots)
      ? { nom: al.nom.slice(0, 60), emoji: S(al.emoji, 8), spots: al.spots.slice(0, 12).filter((z) => z && typeof z.nom === "string" && z.nom).map((z) => ({ nom: z.nom.slice(0, 80), cuisine: S(z.cuisine, 30), ville: S(z.ville, 60), lien: url(z.lien), lat: +z.lat || null, lon: +z.lon || null, note: N(z.note, 0, 10) })) }
      : null;
    if (!text && !s && !al0) return J({ e: "Message vide." }, 400);
    const k = ck(me, n), cur = (await st.get(k, { type: "json" })) || [];
    const mm = { id: rid(), f: me, t: Date.now(), m: text, s, ...(al0 ? { al: al0 } : {}) };
    cur.push(mm);
    await st.setJSON(k, cur.slice(-200));
    const prev = al0 ? "Album : " + al0.nom : s ? "Recommandation : " + s.nom : text.slice(0, 80);
    const ibn = await ibGet(n), pv = ibn.t[me] || {};
    ibn.t[me] = { ts: mm.t, from: me, m: prev, un: (pv.un || 0) + 1 };
    await st.setJSON("ib/" + n, ibn);
    const ibm = await ibGet(me);
    ibm.t[n] = { ts: mm.t, from: me, m: prev, un: 0 };
    await st.setJSON("ib/" + me, ibm);
    return J({ msg: mm });
  }
  if (a === "mreact") {
    const n = nm(u);
    if (!self.fr.includes(n) || !REACTS.includes(e) || typeof id !== "string") return J({ e: "bad" }, 400);
    const k = ck(me, n), cur = (await st.get(k, { type: "json" })) || [], x = cur.find((z) => z.id === id);
    if (!x) return J({ e: "bad" }, 404);
    x.r = x.r || {};
    if (x.r[me] === e) delete x.r[me]; else x.r[me] = e;
    await st.setJSON(k, cur);
    return J({ r: x.r });
  }

  /* ----- réactions et commentaires sur les découvertes ----- */
  if (a === "react") {
    const n = nm(u);
    if (!(await canSee(n)) || n === me || !REACTS.includes(e) || typeof id !== "string") return J({ e: "bad" }, 400);
    const k = "rx/" + n, mp = (await st.get(k, { type: "json" })) || {}, o = mp[id] || {};
    const had = o[me] === e;
    if (had) delete o[me]; else o[me] = e;
    if (Object.keys(o).length) mp[id] = o; else delete mp[id];
    await st.setJSON(k, mp);
    if (!had) await notify(n, { ty: "rx", u: me, e, ref: S(id, 40), m: S(nom, 80) });
    return J({ ok: 1 });
  }
  if (a === "cmget") {
    const n = nm(u);
    if (!(await canSee(n)) || typeof id !== "string") return J({ e: "bad" }, 403);
    return J({ list: (((await st.get("cm/" + n, { type: "json" })) || {})[id] || []).filter((c) => !(self.bl || []).includes(c.u)) });
  }
  if (a === "cmdel") {
    const n = nm(u), k = "cm/" + n, mp = (await st.get(k, { type: "json" })) || {}, l = mp[id] || [];
    const c = l.find((x) => x.id === (typeof cid === "string" ? cid : ""));
    if (!c || (n !== me && c.u !== me)) return J({ e: "bad" }, 403);
    mp[id] = l.filter((x) => x !== c);
    if (!mp[id].length) delete mp[id];
    await st.setJSON(k, mp);
    return J({ ok: 1 });
  }
  if (a === "cmpost") {
    const n = nm(u), text = S(m, 300).trim();
    if (!(await canSee(n)) || typeof id !== "string" || !text) return J({ e: "bad" }, 400);
    if (await limit("cm:" + me, 30, 60000)) return TOO();
    const k = "cm/" + n, mp = (await st.get(k, { type: "json" })) || {}, l = mp[id] || [];
    const cm = { id: rid(), u: me, t: Date.now(), m: text };
    l.push(cm);
    mp[id] = l.slice(-60);
    await st.setJSON(k, mp);
    if (n !== me) await notify(n, { ty: "cm", u: me, ref: S(id, 40), m: S(nom, 80), x: text.slice(0, 80) });
    return J({ cm });
  }

  /* ----- compte ----- */
  if (a === "logoutall" || a === "chpw") {
    if (a === "chpw") {
      if (await limit("chpw:" + me, 8, 9e5)) return TOO();
      if (!timingSafeEqual(await hash(old || "", self.salt), Buffer.from(self.h, "hex"))) return J({ e: "Mot de passe actuel incorrect." }, 401);
      if (!pwOk(pw, me)) return J({ e: "Nouveau mot de passe : 8 caractères minimum, pas trop simple." }, 400);
      self.salt = randomBytes(16).toString("hex");
      self.h = (await hash(pw, self.salt)).toString("hex");
    }
    self.tv = (self.tv || 0) + 1;
    await saveU(me, self);
    return J({ t: sign(me, self.tv, key), u: me });
  }
  if (a === "export") {
    if (await limit("exp:" + me, 5, 36e5)) return TOO();
    return J({ compte: { pseudo: me, public: !!self.pub, amis: self.fr, abonnements: self.fo, demandes_recues: self.rq, consentement: self.cg || null }, profil: (await st.get("p/" + me, { type: "json" })) || {}, restaurants: await data(me), commentaires_recus: (await st.get("cm/" + me, { type: "json" })) || {}, reactions_recues: (await st.get("rx/" + me, { type: "json" })) || {}, exporte_le: new Date().toISOString() });
  }
  if (a === "delacc") {
    if (await limit("del:" + me, 5, 9e5)) return TOO();
    if (!timingSafeEqual(await hash(pw || "", self.salt), Buffer.from(self.h, "hex"))) return J({ e: "Mot de passe incorrect." }, 401);
    for (const n of self.fr) {
      const o = await st.get("u/" + n, { type: "json" });
      if (o) { o.fr = o.fr.filter((x) => x !== me); await saveU(n, o); }
      await st.delete(ck(me, n)).catch(() => {});
      const ib = await ibGet(n); delete ib.t[me]; await st.setJSON("ib/" + n, ib);
    }
    await st.setJSON("pubs", (await pubs()).filter((x) => x !== me));
    /* purge complète : liens, commentaires, réactions, notifications laissés chez les autres */
    const keys = async (pre) => ((await st.list({ prefix: pre })).blobs || []).map((b) => b.key);
    for (const k of await keys("u/")) {
      const o = await st.get(k, { type: "json" });
      if (!o || k === "u/" + me) continue;
      const f = (l) => (Array.isArray(l) ? l.filter((x) => x !== me) : l);
      if ([o.fr, o.fo, o.rq].some((l) => Array.isArray(l) && l.includes(me))) { o.fr = f(o.fr); o.fo = f(o.fo); o.rq = f(o.rq); await st.setJSON(k, o); }
    }
    for (const k of await keys("cm/")) {
      const mp = await st.get(k, { type: "json" }); let ch = false;
      for (const id of Object.keys(mp || {})) { const l = mp[id].filter((c) => c.u !== me); if (l.length !== mp[id].length) { ch = true; if (l.length) mp[id] = l; else delete mp[id]; } }
      if (ch) await st.setJSON(k, mp);
    }
    for (const k of await keys("rx/")) {
      const mp = await st.get(k, { type: "json" }); let ch = false;
      for (const id of Object.keys(mp || {})) if (mp[id] && mp[id][me]) { delete mp[id][me]; ch = true; if (!Object.keys(mp[id]).length) delete mp[id]; }
      if (ch) await st.setJSON(k, mp);
    }
    for (const k of await keys("nt/")) {
      const l = await st.get(k, { type: "json" });
      if (Array.isArray(l) && l.some((x) => x.u === me)) await st.setJSON(k, l.filter((x) => x.u !== me));
    }
    for (const k of await keys("c/")) if (k.split("/")[1].split("__").includes(me)) await st.delete(k).catch(() => {});
    for (const k of ["u/", "d/", "i/", "p/", "rx/", "cm/", "nt/", "ib/", "ps/"]) await st.delete(k + me).catch(() => {});
    return J({ ok: 1 });
  }
  return J({ e: "bad" }, 400);
};


/* CORS : uniquement pour les applications mobiles (Capacitor) et le site lui-même */
const ORIGINS = ["capacitor://localhost", "ionic://localhost", "https://localhost", "http://localhost"];
export const onRequest = async ({ request: req, env }) => {
  ENV = env; if (!SEC) SEC = env.AUTH_SECRET || "";
  if (!env.DB) return J({ e: "Base de données non reliée (binding DB manquant)." }, 500);
  const o = req.headers.get("origin") || "";
  const cors = ORIGINS.includes(o) ? { "access-control-allow-origin": o, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type", "access-control-max-age": "86400", vary: "origin" } : {};
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  const r = await handle(req);
  for (const [k, v] of Object.entries(cors)) r.headers.set(k, v);
  return r;
};
