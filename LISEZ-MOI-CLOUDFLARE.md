# Crumb sur Cloudflare (gratuit)

Structure du dépôt :
- `public/`         le site
- `functions/api.js` le serveur (stockage D1)
- `src/index.js`    point d'entrée Cloudflare (route /api vers le serveur, le reste vers le site)
- `wrangler.jsonc`  configuration (base de données D1 `crumb-db` déjà reliée, fichiers du site)
- `store/`          outils pour les applications mobiles (facultatif)

## Mise en ligne (une seule fois)
1. Compte sur dash.cloudflare.com, base D1 `crumb-db` créée.
2. Compute > Workers & Pages > Create application > importer le dépôt GitHub.
   - Nom du projet : `crumb` (doit être identique à "name" dans wrangler.jsonc)
   - Build command : (vide)
   - Deploy command : `npx wrangler deploy` (déjà rempli)
3. Après le premier déploiement : projet > Settings > Variables and secrets > Add :
   `AUTH_SECRET` (type Secret) = une longue chaîne aléatoire. Puis relancer un déploiement.
4. La base D1 est reliée par wrangler.jsonc (variable `DB`). La table se crée toute seule.

## Mises à jour
Remplace les fichiers dans GitHub : Cloudflare republie en 1 minute environ.

## Limites du plan gratuit
- Workers : 100 000 requêtes par jour, 10 ms de CPU par requête.
- D1 : 5 Go, 5 millions de lectures et 100 000 écritures par jour.
