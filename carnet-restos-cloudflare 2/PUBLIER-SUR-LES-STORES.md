# Publier Crumb sur l'App Store et Google Play

Crumb est une application web (PWA). Pour les stores, on l'emballe dans une coque native avec **Capacitor**
(un seul projet pour iOS et Android). Ton site Netlify reste le serveur : l'app mobile appelle la même API.

## 0. Ce qui est déjà prêt dans ce projet
- Suppression de compte dans l'app (obligatoire chez Apple), export des données, politique de confidentialité en ligne
  (`/confidentialite`, `/conditions`, `/mentions-legales`).
- Signalement, blocage d'utilisateurs, suppression de commentaires (obligatoire pour les apps avec contenu d'utilisateurs).
- Aucun traceur, aucune pub, aucun service externe de polices : fiches « confidentialité des données » simples à remplir.
- Le serveur accepte les requêtes des apps Capacitor (CORS) ; `config.js` permet de pointer l'app vers ton site.

## 1. À faire avant tout
1. **Nom de domaine** conseillé (ex. crumb.app) branché sur Netlify : plus crédible pour les stores.
2. Ouvre `legal.js` et renseigne `LEGAL.nom` et surtout `LEGAL.email` (adresse de support publique, exigée par les deux stores).
3. Choisis un identifiant d'app définitif, par exemple `com.tonnom.crumb` (impossible à changer ensuite).
4. Les signalements arrivent dans le stockage Netlify Blobs (clés `rp/…`). Tu dois les consulter régulièrement
   (Apple et Google attendent une réaction rapide, idéalement sous 24 h).

## 2. Préparer le projet mobile (sur ton ordinateur)
```bash
npm install
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
cp store/capacitor.config.json capacitor.config.json      # modifie appId
SITE_URL=https://ton-site.netlify.app node store/build-www.mjs
npx cap add android
npx cap add ios            # nécessite un Mac
npx cap sync
```
Ensuite : `npx cap open android` (Android Studio) ou `npx cap open ios` (Xcode).
À chaque modification du site : relance `build-www.mjs` puis `npx cap sync`.

## 3. Google Play (Android)
- Compte développeur : **25 $, paiement unique**, vérification d'identité.
- Les comptes *personnels* créés récemment doivent d'abord faire un **test fermé avec au moins 12 testeurs pendant 14 jours**
  avant de pouvoir publier en production. Prévois ce délai et recrute tes testeurs (amis) tout de suite.
- Dans Android Studio : *Build › Generate Signed Bundle* → fichier `.aab`. Garde précieusement la clé de signature.
- Dans la Play Console : fiche du store (description, captures d'écran téléphone, icône 512×512, image de présentation
  1024×500), questionnaire de classification, **URL de politique de confidentialité** (`https://ton-site/confidentialite`),
  formulaire « Sécurité des données » (collecte : pseudo, mot de passe, contenus, localisation approximative sur demande ;
  aucune donnée partagée avec des tiers à des fins de pub), **URL de suppression de compte** (indique la procédure
  Réglages › Supprimer mon compte).

## 4. App Store (iOS)
- Il faut un **Mac avec Xcode** et l'**Apple Developer Program : 99 $ par an**.
- Dans Xcode : choisis ton équipe, l'identifiant d'app, puis *Product › Archive › Distribute App › App Store Connect*.
- Dans App Store Connect : captures d'écran (iPhone 6,9" et 6,5" au minimum), description, mots-clés, catégorie
  (Cuisine et boissons ou Style de vie), URL d'assistance, URL de confidentialité, étiquettes de confidentialité,
  classe d'âge, compte de démonstration pour le relecteur (crée un compte de test et donne-lui l'identifiant).
- **Attention à la règle 4.2 (fonctionnalités minimales)** : Apple refuse les simples « sites dans une app ».
  Pour maximiser les chances, ajoute 2 ou 3 fonctions réellement natives via des plugins Capacitor :
  retour haptique (`@capacitor/haptics`), partage natif (`@capacitor/share`), appareil photo (`@capacitor/camera`
  pour la photo du resto), notifications push (`@capacitor/push-notifications`), et explique-les dans les notes de revue.
- Règles que Crumb respecte déjà : suppression de compte dans l'app (5.1.1), contenus d'utilisateurs avec signalement,
  blocage et contact publié (1.2).
- Délai habituel de relecture : 1 à 3 jours ; un premier refus est fréquent, réponds simplement dans la résolution.

## 5. Alternative plus simple pour Android uniquement
[PWABuilder](https://www.pwabuilder.com) génère directement un paquet Android (Trusted Web Activity) à partir de l'adresse
de ton site, sans Android Studio. Il faut ensuite publier le fichier `/.well-known/assetlinks.json` sur ton domaine.
Les exigences de la Play Console (compte, test des 12 testeurs, fiches) restent les mêmes.

## 6. Check-list finale
- [ ] `LEGAL.email` rempli, pages légales relues
- [ ] Domaine personnalisé en HTTPS
- [ ] Compte de démonstration créé pour les relecteurs
- [ ] Captures d'écran et icônes prêtes
- [ ] Mise à jour de `config.js` via `build-www.mjs` (adresse du site)
- [ ] Surveillance des signalements en place
