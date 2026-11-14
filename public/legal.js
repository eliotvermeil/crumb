(function(){
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
/* À COMPLÉTER PAR L'ÉDITEUR (facultatif) : nom affiché dans les mentions légales et adresse de contact. */
const LEGAL={nom:"",email:"",maj:"14 novembre 2026"};
const mail=()=>LEGAL.email?`<a href="mailto:${esc(LEGAL.email)}">${esc(LEGAL.email)}</a>`:"";
const LG={
 mentions:["Mentions légales",()=>`
<h3>Éditeur</h3><p>Crumb est un service édité à titre non professionnel${LEGAL.nom?" par <b>"+esc(LEGAL.nom)+"</b>":" par une personne physique"}. Conformément à l’article 6-III-2 de la loi n° 2004-575 du 21 juin 2004 (LCEN), l’identité de l’éditeur est communiquée à l’hébergeur.${LEGAL.email?" Contact : "+mail()+".":""}</p>
<h3>Directeur de la publication</h3><p>L’éditeur du service.</p>
<h3>Hébergeur</h3><p>Netlify, Inc., 512 2nd Street, Suite 200, San Francisco, CA 94107, États-Unis — <a href="https://www.netlify.com" target="_blank" rel="noopener">netlify.com</a>.</p>
<h3>Contenus des utilisateurs</h3><p>Les avis, photos, commentaires et messages sont publiés sous la seule responsabilité de leurs auteurs. Tout contenu manifestement illicite peut être signalé à l’éditeur${LEGAL.email?" ("+mail()+")":""} et sera retiré dans les meilleurs délais.</p>
<h3>Propriété intellectuelle</h3><p>Le nom, le logo et le design de Crumb appartiennent à son éditeur. Les données cartographiques et les composants tiers sont cités dans « Crédits ».</p>
<small>Dernière mise à jour : ${LEGAL.maj}</small>`],
 priv:["Confidentialité",()=>`
<h3>En résumé</h3><ul><li>Pas de publicité, pas de pistage, pas de cookie.</li><li>Tes données ne sont jamais vendues.</li><li>Tu peux tout exporter ou tout supprimer depuis Réglages.</li></ul>
<h3>Responsable du traitement</h3><p>L’éditeur de Crumb${LEGAL.nom?" ("+esc(LEGAL.nom)+")":""}.${LEGAL.email?" Contact : "+mail()+".":""}</p>
<h3>Données traitées et finalités</h3><ul>
<li><b>Sans compte</b> : tes restos, notes, avis, albums et photos restent uniquement sur ton appareil (stockage local du navigateur). Rien n’est envoyé à nos serveurs.</li>
<li><b>Avec un compte</b> : pseudo, mot de passe (stocké uniquement sous forme chiffrée irréversible), restos, notes, avis, photos, adresses et coordonnées de lieux que tu enregistres, albums, profil (avatar, bannière, favoris), relations d’amitié et d’abonnement, messages, commentaires, réactions et notifications. Finalité : synchroniser ton carnet et permettre les fonctions sociales.</li>
<li><b>Consentement</b> : la date de ton acceptation des conditions est conservée.</li>
<li><b>Sécurité</b> : ton adresse IP est utilisée brièvement pour limiter les tentatives abusives (connexions, requêtes répétées). Elle n’est pas utilisée à d’autres fins.</li></ul>
<h3>Bases légales</h3><p>Exécution du service que tu demandes (article 6.1.b du RGPD), consentement lors de l’inscription et intérêt légitime pour la sécurité du service (6.1.f).</p>
<h3>Qui voit quoi</h3><p>Tes amis voient tes restos, notes et avis. Si ton profil est <b>public</b>, tout utilisateur connecté peut le consulter et s’y abonner. Un profil <b>privé</b> n’est visible que de tes amis. Tu peux changer cela à tout moment dans Réglages.</p>
<h3>Services tiers contactés depuis ton appareil</h3><ul>
<li><b>OpenStreetMap</b> (fond de carte) : reçoit ton adresse IP et la zone affichée.</li>
<li><b>Nominatim</b> (OpenStreetMap) : reçoit le lieu ou l’adresse que tu recherches.</li>
<li><b>Wikimedia Commons</b> : reçoit le nom du resto cherché lors de la suggestion de photos.</li>
<li><b>Google Maps</b> : uniquement si tu ouvres un lien « Voir la fiche » ou « Itinéraire ».</li>
<li>Pour les recommandations, notre serveur interroge OpenStreetMap (Overpass) avec la ville ou la position approximative demandée.</li></ul>
<p>Les polices et la bibliothèque de carte sont hébergées sur Crumb : aucun service de polices ou de CDN externe n’est contacté.</p>
<h3>Géolocalisation</h3><p>Ta position n’est demandée que lorsque tu touches « Ma position » ou « Autour de moi ». Elle n’est pas conservée.</p>
<h3>Stockage local</h3><p>Crumb utilise le stockage local de ton navigateur pour fonctionner (session, carnet hors-ligne, préférences). Ces éléments sont strictement nécessaires au service : aucun bandeau de consentement n’est requis.</p>
<h3>Hébergement et transferts</h3><p>Les données sont hébergées chez Netlify. Des transferts vers les États-Unis peuvent avoir lieu, encadrés par les mécanismes prévus par le RGPD (clauses contractuelles types / cadre de protection des données UE–États-Unis).</p>
<h3>Durées de conservation</h3><p>Tes données sont conservées tant que ton compte existe, puis supprimées lors de la suppression du compte. Les suppressions de spots sont définitives après 90 jours au plus.</p>
<h3>Tes droits</h3><p>Accès, rectification, effacement, portabilité, limitation et opposition. Tu peux les exercer toi-même : <b>Réglages › Mes données</b> (export complet) et <b>Réglages › Compte › Supprimer mon compte</b> (effacement immédiat de tes données, de tes commentaires, réactions et liens d’amitié chez les autres).${LEGAL.email?" Pour toute autre demande : "+mail()+".":""} Tu peux aussi saisir la CNIL (<a href="https://www.cnil.fr" target="_blank" rel="noopener">cnil.fr</a>).</p>
<h3>Mineurs</h3><p>La création d’un compte est réservée aux personnes de 15 ans ou plus.</p>
<h3>Sécurité</h3><p>Connexion chiffrée (HTTPS), mots de passe protégés par un hachage robuste, sessions révocables, limitation des tentatives et contrôle des données reçues.</p>
<small>Dernière mise à jour : ${LEGAL.maj}</small>`],
 cgu:["Conditions",()=>`
<h3>1. Objet</h3><p>Crumb permet de tenir un carnet de restaurants, de le synchroniser et de le partager avec des amis. L’utilisation du service implique l’acceptation de ces conditions.</p>
<h3>2. Compte</h3><p>Le compte est facultatif, personnel et réservé aux personnes de 15 ans ou plus. Tu es responsable de la confidentialité de ton mot de passe. Tu peux supprimer ton compte à tout moment.</p>
<h3>3. Contenus</h3><p>Tu restes propriétaire de ce que tu publies et tu nous autorises uniquement à le stocker et à l’afficher aux personnes que tu choisis (amis, ou tout le monde si ton profil est public), pour faire fonctionner le service. Tu garantis avoir le droit de publier les photos et textes ajoutés.</p>
<h3>4. Règles de bonne conduite</h3><p>Il est interdit de publier des contenus illicites, haineux, harcelants, diffamatoires, pornographiques, portant atteinte à la vie privée ou aux droits d’autrui, ainsi que du spam ou des tentatives de piratage. Les comptes ne respectant pas ces règles peuvent être suspendus ou supprimés, et les contenus retirés.</p>
<h3>5. Informations sur les restaurants</h3><p>Les adresses proposées proviennent de sources ouvertes (OpenStreetMap) et peuvent être inexactes ou périmées. Vérifie les horaires et les informations avant de te déplacer. Les avis publiés par les utilisateurs reflètent leur seule opinion.</p>
<h3>6. Disponibilité et responsabilité</h3><p>Le service est fourni « en l’état », sans garantie de disponibilité continue. Pense à utiliser l’export de sauvegarde dans Réglages. L’éditeur ne peut être tenu responsable des dommages indirects, des contenus des utilisateurs ou de l’indisponibilité de services tiers.</p>
<h3>7. Signalement</h3><p>Pour signaler un contenu ou un comportement abusif${LEGAL.email?", écris à "+mail():", contacte l’éditeur du service"}. Tu peux aussi retirer un ami, supprimer les commentaires de tes fiches et passer ton profil en privé.</p>
<h3>8. Modifications et droit applicable</h3><p>Ces conditions peuvent évoluer ; les changements importants seront signalés dans l’application. Elles sont soumises au droit français.</p>
<small>Dernière mise à jour : ${LEGAL.maj}</small>`],
 cred:["Crédits",()=>`
<ul><li><b>Carte</b> : © les contributeurs d’<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>, données sous licence ODbL. Recherche de lieux : Nominatim.</li>
<li><b>Bibliothèque de carte</b> : Leaflet (licence BSD-2).</li>
<li><b>Photos suggérées</b> : Wikimedia Commons, selon la licence de chaque auteur.</li>
<li><b>Polices</b> : Inter Tight, Space Grotesk et Manrope (SIL Open Font License).</li>
<li><b>Hébergement</b> : Netlify.</li></ul><small>Crumb · Keep a taste of everywhere.</small>`]
};

const LGOUT={};
const LGE={
 mentions:["Legal notice",()=>`
<h3>Publisher</h3><p>Crumb is a service published on a non-professional basis${LEGAL.nom?" by <b>"+esc(LEGAL.nom)+"</b>":" by a private individual"}. In accordance with Article 6-III-2 of French Law No. 2004-575 of 21 June 2004 (LCEN), the publisher’s identity has been disclosed to the host.${LEGAL.email?" Contact: "+mail()+".":""}</p>
<h3>Publication director</h3><p>The publisher of the service.</p>
<h3>Host</h3><p>Netlify, Inc., 512 2nd Street, Suite 200, San Francisco, CA 94107, United States — <a href="https://www.netlify.com" target="_blank" rel="noopener">netlify.com</a>.</p>
<h3>User content</h3><p>Reviews, photos, comments and messages are published under the sole responsibility of their authors. Any manifestly unlawful content can be reported to the publisher${LEGAL.email?" ("+mail()+")":""} and will be removed as soon as possible.</p>
<h3>Intellectual property</h3><p>The name, logo and design of Crumb belong to its publisher. Map data and third-party components are listed under “Credits”.</p>
<small>Last updated: ${LEGAL.maj}</small>`],
 priv:["Privacy",()=>`
<h3>In short</h3><ul><li>No ads, no tracking, no cookies.</li><li>Your data is never sold.</li><li>You can export or delete everything from Settings.</li></ul>
<h3>Data controller</h3><p>The publisher of Crumb${LEGAL.nom?" ("+esc(LEGAL.nom)+")":""}.${LEGAL.email?" Contact: "+mail()+".":""}</p>
<h3>Data processed and purposes</h3><ul>
<li><b>Without an account</b>: your restaurants, ratings, reviews, albums and photos stay on your device only (the browser’s local storage). Nothing is sent to our servers.</li>
<li><b>With an account</b>: username, password (stored only as an irreversible hash), restaurants, ratings, reviews, photos, addresses and coordinates of places you save, albums, profile (avatar, banner, favorites), friendships and follows, messages, comments, reactions and notifications. Purpose: to sync your notebook and enable the social features.</li>
<li><b>Consent</b>: the date on which you accepted the terms is kept.</li>
<li><b>Security</b>: your IP address is briefly used to limit abusive attempts (logins, repeated requests). It is not used for any other purpose.</li></ul>
<h3>Legal bases</h3><p>Performance of the service you request (Article 6.1.b GDPR), consent at sign-up, and legitimate interest in the security of the service (6.1.f).</p>
<h3>Who sees what</h3><p>Your friends see your restaurants, ratings and reviews. If your profile is <b>public</b>, any logged-in user can view it and follow it. A <b>private</b> profile is visible to your friends only. You can change this at any time in Settings.</p>
<h3>Third-party services contacted from your device</h3><ul>
<li><b>OpenStreetMap</b> (map background): receives your IP address and the displayed area.</li>
<li><b>Nominatim</b> (OpenStreetMap): receives the place or address you search for.</li>
<li><b>Wikimedia Commons</b>: receives the restaurant name searched when suggesting photos.</li>
<li><b>Google Maps</b>: only if you open a “View page” or “Directions” link.</li>
<li>For recommendations, our server queries OpenStreetMap (Overpass) with the requested city or approximate position.</li></ul>
<p>Fonts and the map library are hosted by Crumb: no external font or CDN service is contacted.</p>
<h3>Geolocation</h3><p>Your position is requested only when you tap “My location” or “Around me”. It is not stored.</p>
<h3>Local storage</h3><p>Crumb uses your browser’s local storage to work (session, offline notebook, preferences). These items are strictly necessary for the service: no consent banner is required.</p>
<h3>Hosting and transfers</h3><p>Data is hosted by Netlify. Transfers to the United States may take place, covered by the mechanisms provided for by the GDPR (standard contractual clauses / EU–US data protection framework).</p>
<h3>Retention</h3><p>Your data is kept as long as your account exists, then deleted when the account is deleted. Deleted spots are permanently removed after 90 days at most.</p>
<h3>Your rights</h3><p>Access, rectification, erasure, portability, restriction and objection. You can exercise them yourself: <b>Settings › My data</b> (full export) and <b>Settings › Account › Delete my account</b> (immediate erasure of your data, and of your comments, reactions and friend links on other people’s accounts).${LEGAL.email?" For any other request: "+mail()+".":""} You can also lodge a complaint with the CNIL (<a href="https://www.cnil.fr" target="_blank" rel="noopener">cnil.fr</a>).</p>
<h3>Minors</h3><p>Creating an account is reserved for people aged 15 or over.</p>
<h3>Security</h3><p>Encrypted connection (HTTPS), passwords protected by strong hashing, revocable sessions, attempt limiting and validation of received data.</p>
<small>Last updated: ${LEGAL.maj}</small>`],
 cgu:["Terms",()=>`
<h3>1. Purpose</h3><p>Crumb lets you keep a restaurant notebook, sync it and share it with friends. Using the service implies acceptance of these terms.</p>
<h3>2. Account</h3><p>An account is optional, personal and reserved for people aged 15 or over. You are responsible for keeping your password confidential. You can delete your account at any time.</p>
<h3>3. Content</h3><p>You remain the owner of what you publish and only authorize us to store it and display it to the people you choose (friends, or everyone if your profile is public), in order to run the service. You warrant that you have the right to publish the photos and texts you add.</p>
<h3>4. Code of conduct</h3><p>It is forbidden to publish unlawful, hateful, harassing, defamatory or pornographic content, content that infringes privacy or the rights of others, as well as spam or hacking attempts. Accounts that do not follow these rules may be suspended or deleted, and content removed.</p>
<h3>5. Restaurant information</h3><p>Suggested places come from open sources (OpenStreetMap) and may be inaccurate or out of date. Check opening hours and details before you go. Reviews published by users reflect their own opinion only.</p>
<h3>6. Availability and liability</h3><p>The service is provided “as is”, with no guarantee of continuous availability. Remember to use the backup export in Settings. The publisher cannot be held liable for indirect damages, user content or the unavailability of third-party services.</p>
<h3>7. Reporting</h3><p>To report abusive content or behavior${LEGAL.email?", write to "+mail():", contact the publisher of the service"}. You can also remove a friend, delete comments on your pages and set your profile to private.</p>
<h3>8. Changes and governing law</h3><p>These terms may change; significant changes will be announced in the app. They are governed by French law. The French version prevails in case of discrepancy.</p>
<small>Last updated: ${LEGAL.maj}</small>`],
 cred:["Credits",()=>`
<ul><li><b>Map</b>: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors, data under the ODbL licence. Place search: Nominatim.</li>
<li><b>Map library</b>: Leaflet (BSD-2 licence).</li>
<li><b>Suggested photos</b>: Wikimedia Commons, under each author’s licence.</li>
<li><b>Fonts</b>: Inter Tight, Space Grotesk and Manrope (SIL Open Font License).</li>
<li><b>Hosting</b>: Netlify.</li></ul><small>Crumb · Keep a taste of everywhere.</small>`]
};
const LGF=LG;
const curL=()=>{let l="fr";try{l=window.I18N?window.I18N.get():(localStorage.getItem("cr-lang")||"fr")}catch(e){}return l==="en"?LGE:LGF};
Object.keys(LGF).forEach(k=>Object.defineProperty(LGOUT,k,{enumerable:true,get:()=>curL()[k]}));

window.LEGALDOC={LEGAL:LEGAL,LG:LGOUT};
})();
