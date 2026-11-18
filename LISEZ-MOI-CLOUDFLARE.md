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

---

## Réglages à faire une seule fois (nouveautés)

**1. Voir les signalements (administrateur)**
Dans Cloudflare → ton projet `crumb` → Settings → Variables and Secrets → Add, type **Text** :
`ADMIN` = ton pseudo Crumb (en minuscules, par exemple `eliot`).
Après le déploiement, un bouton « Signalements » apparaît dans tes Réglages dans l'app.

**2. Notifications push**
Secret `VAPID_PRIVATE` (type Secret). Voir le message où je te l'ai donné.

**3. Sauvegarde de la base**
La base D1 garde automatiquement 30 jours d'historique (« Time Travel »).
Pour revenir en arrière : Cloudflare → Storage & Databases → D1 → `crumb-db` → onglet « Time Travel » (ou `npx wrangler d1 time-travel restore crumb-db --timestamp=...`).

**4. Nom de domaine**
Cloudflare → ton projet `crumb` → Settings → Domains & Routes → Add → Custom domain.
Si le domaine est acheté chez Cloudflare (Registrar), c'est automatique. Sinon, suis les instructions DNS affichées.

**5. Dépôt GitHub privé**
GitHub → ton dépôt `crumb` → Settings → tout en bas « Danger Zone » → Change visibility → Make private.
Cloudflare garde l'accès au dépôt privé (la connexion GitHub reste valable).

## Ce qui a été ajouté
- Codes de secours + « Mot de passe oublié ? » (sans e-mail)
- Bilan de l'année partageable en image
- Liens de partage de profil (`/u/pseudo`) avec invitation automatique (demande d'ami envoyée à l'inscription)
- Notifications push quand un ami ajoute un resto (max. 1 toutes les 6 h par ami, désactivable dans les Réglages)
- Jusqu'à 3 photos par resto, recadrage des photos, bio, albums visibles par les amis

## Mise à jour : messages, Amis, gestes

- **Notifications de messages** : un push est envoyé à chaque nouveau message (si le destinataire a activé les notifications sur son téléphone). Réglage « Messages » dans Réglages. Appuyer sur la notification ouvre directement la conversation.
- **Page Amis** : trois onglets (Fil, Messages, Amis).
- **Fermer une fenêtre** : glisser vers le bas ou vers la droite, n'importe où. Sur un profil ou une conversation, glisser vers la droite revient en arrière.
- **À tester** : bouton « + » sur chaque resto du profil d'une personne, et bouton dans sa fiche.
