# Établi — site d’Elliot Mooser, studio web à Genève

Site vitrine d’**Établi**, l’activité indépendante d’Elliot Mooser : création de sites web clairs et abordables pour les artisans, commerces et restaurants de Genève.

Direction artistique : « verre dépoli à minuit », version adoucie. Fond encre (jamais noir pur), texte jamais blanc pur, un seul accent violet éteint réservé aux actions, cartes en verre et filets fins. HTML, CSS et JavaScript sans dépendance ni étape de build.

## Voir le site en local

```bash
cd Claude-site
python3 -m http.server 8080
# ou : npx serve .
```

Puis ouvrir http://localhost:8080 dans le navigateur. On peut aussi ouvrir `index.html` directement (double-clic), mais certaines animations sont plus fidèles avec un petit serveur local.

## Contenu

```
index.html               Page d’accueil (hero, constat, offres, méthode, inclus, comparatif, à propos, FAQ, contact)
mentions-legales.html    Impressum (obligatoire en Suisse, LCD art. 3 al. 1 let. s)
confidentialite.html     Déclaration de protection des données (LPD art. 19)
assets/css/style.css     Système de design et mise en page
assets/js/main.js        Animations et interactions
assets/fonts/            Polices hébergées localement (licence SIL OFL)
assets/img/              Logo et favicon
```

## Avant la mise en ligne : à compléter

Les éléments surlignés en rouge (classe `todo`) dans les pages légales doivent être remplis :

- **Adresse postale** : obligatoire dans l’impressum.
- **Numéro IDE** (CHE-…) : attribué après l’affiliation AVS comme indépendant (OCAS à Genève).
- **Hébergeur** : nom, adresse et pays, une fois l’hébergement choisi.
- **Messagerie** : garantie de transfert vers les États-Unis si l’adresse Gmail est conservée. Une adresse sur votre domaine (offerte avec un .ch chez Infomaniak) simplifie la page de protection des données.
- **Photo** : remplacer le monogramme « EM » de la section À propos par une photo (`assets/img/elliot.jpg`, voir le commentaire dans `index.html`).

## Mise en ligne recommandée (plus tard)

- **Nom de domaine** : `etabli.ch` semblait libre le 8 octobre 2026 (à confirmer sur nic.ch). Infomaniak, à Genève, le propose autour de 8.90 CHF/an, avec une adresse e-mail offerte.
- **Hébergement** : Cloudflare Pages (gratuit, usage commercial autorisé à ce jour) ou l’offre Starter d’Infomaniak (gratuite avec le domaine, très limitée).
- Vérifier que le nom « Établi » n’est pas déjà utilisé par une entreprise du même secteur : zefix.ch (registre du commerce) et swissreg.ch (marques).

## Modifier les textes et les prix

Tout le contenu est dans `index.html`, en clair. Les prix apparaissent dans les cartes d’offres, la section Sérénité, le bandeau de lancement, le comparatif et la FAQ : pensez à les modifier partout.
