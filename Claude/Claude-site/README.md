# Lumen — site vitrine d’agence (conseil & création de sites web)

Site one-page très animé, inspiré du style Stripe : fond blanc, encre bleu nuit, une seule couleur d’action indigo (`#533afd`), typographie fine (poids 300), filets de 1 px et aucune ombre.

HTML, CSS et JavaScript « vanilla » : aucune dépendance ni étape de build.

## Lancer le site en local

```bash
npx serve .
# ou
python3 -m http.server 8080
```

Puis ouvrir http://localhost:8080 (ou le port affiché par `serve`).

## Structure

```
index.html              Contenu de toutes les sections
assets/css/style.css    Tokens de design, composants, animations, responsive
assets/js/main.js       Effets au scroll et au survol
assets/favicon.svg      Logo
```

## Animations incluses

**Au scroll**
- Titres qui se révèlent mot par mot, blocs qui apparaissent en cascade
- Barre de progression de lecture et navigation qui se masque/réapparaît
- Manifeste dont les mots s’allument au fil du défilement
- Section « Méthode » : rail de progression + écran collant qui change à chaque étape (audit, arborescence, maquette, tableau de bord)
- Section « Réalisations » épinglée : le scroll vertical fait défiler les projets horizontalement
- Compteurs animés, filets qui se tracent, grand logo qui remonte dans le footer

**Au survol**
- Curseur « crochets de précision » qui encadre les éléments cliquables
- Grille du hero éclairée sous la souris + maquette inclinée en 3D
- Halo qui suit la souris dans les grilles de cartes, icônes redessinées
- Boutons magnétiques, reflet sur les boutons principaux, flèches qui s’allongent
- Liens dont le texte « roule », indicateur glissant dans le menu
- Mini-sites des projets qui défilent comme une vraie page

Tout est désactivé proprement si le visiteur a activé « réduire les animations » dans son système, et les effets de souris ne s’activent pas sur écran tactile.

## À personnaliser avant la mise en ligne

Le contenu signalé par un commentaire HTML (« d’exemple », « fictifs ») dans `index.html` est fictif :

- **Nom et coordonnées** : « Lumen », `bonjour@lumen-conseil.fr`, `01 23 45 67 89`
- **Logos clients, études de cas et témoignages** : noms et résultats d’exemple
- **Chiffres** : hero, section « En chiffres » et maquettes
- **Tarifs** : section « Offres »
- **Liens légaux** : « Mentions légales » et « Confidentialité » pointent vers `#`

### Formulaire de contact

Sans serveur, le formulaire valide les champs puis ouvre la messagerie du visiteur avec la demande pré-remplie (adresse définie par `data-email` sur la balise `<form>`). Pour un envoi direct, branchez un service comme Formspree ou Netlify Forms dans le gestionnaire `submit` de `assets/js/main.js`.

### Couleurs et typographie

Toutes les couleurs sont des variables CSS en haut de `assets/css/style.css` (`--color-indigo-ink`, `--color-midnight-ink`, etc.). La police **Inter Tight** (Google Fonts) remplace sohne-var, qui est payante.

## Déploiement

Le dossier peut être publié tel quel sur GitHub Pages, Netlify, Vercel ou tout hébergement statique. Pour GitHub Pages : *Settings → Pages → Deploy from a branch*, puis choisir la branche et le dossier racine.
