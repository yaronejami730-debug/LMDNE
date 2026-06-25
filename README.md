# LMDNE — Campagne de dons

Outil téléopérateur : appeler des contacts, envoyer le lien de don par SMS (AllMySMS) ou WhatsApp, suivre les statuts.

## Fonctionnalités

- Liste des contacts (Prénom, Nom, Téléphone) avec recherche + filtre.
- **Appeler** : lien `tel:`, enregistre date/heure de chaque appel. Avertit si le contact a déjà été appelé.
- **SMS** : envoi réel via AllMySMS avec le lien de don.
- **Relancer** : renvoi manuel d'un message de relance.
- **WhatsApp** : ouvre WhatsApp avec message + lien pré-remplis.
- **Statut** : menu déroulant manuel (datage automatique). Passe en « Lien envoyé » au clic SMS/WhatsApp.
- Annotations d'origine du fichier importé conservées (commentaire, initiales, catégorie, drapeau).

## Stack

- Next.js (App Router) + React
- SQLite (better-sqlite3) — `data.db` local
- AllMySMS API HTTPS v9.0

## Démarrage

```bash
npm install
cp .env.example .env.local   # remplir les identifiants AllMySMS
npm run dev
```

App sur http://localhost:3000

## Variables d'environnement

Voir `.env.example` : `DONATION_URL`, `ALLMYSMS_LOGIN`, `ALLMYSMS_APIKEY`, `ALLMYSMS_SENDER`.
