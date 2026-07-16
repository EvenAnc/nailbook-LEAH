# 💅 NailBook — Nails By LV

Application de gestion des rendez-vous et comptabilité pour prothésiste ongulaire.

---

## 🔐 Connexion (Firebase Auth)

L'application est entièrement sécurisée par **Firebase Authentication** pour empêcher tout vol de données sur GitHub Pages.

**Identifiants :**
- **Email :** `leavengeons@gmail.com` (ou celui que tu configureras dans `config.js`)
- **Mot de passe :** `d0M41n-leah` (à créer dans Firebase ou par défaut en hors-ligne)

> ⚠️ Le mot de passe ne se modifie plus dans l'application, mais depuis ta console Firebase !

---

## 🔥 Configuration Firebase (synchronisation multi-appareils)

Pour que les données soient synchronisées entre ton téléphone et ton PC, il faut configurer Firebase :

### Étape 1 — Créer un projet Firebase

1. Aller sur [console.firebase.google.com](https://console.firebase.google.com)
2. Cliquer sur **"Ajouter un projet"**
3. Nommer le projet : `nailbook-lv`
4. Désactiver Google Analytics (pas nécessaire)
5. Cliquer sur **Créer le projet**

### Étape 2 — Configurer Firestore

1. Dans le menu de gauche : **Build → Firestore Database**
2. Cliquer **Créer une base de données**
3. Choisir **Mode production**
4. Choisir la région : `eur3 (europe-west)` (serveurs en Europe)
5. Cliquer **Activer**

### Étape 3 — Configurer l'Authentification (Sécurité)

1. Dans le menu de gauche : **Build → Authentication**
2. Cliquer sur **Commencer**
3. Dans l'onglet **Sign-in method**, choisir **Adresse e-mail/Mot de passe**
4. Activer le premier bouton et cliquer sur **Enregistrer**
5. Aller dans l'onglet **Users** (Utilisateurs) en haut
6. Cliquer sur **Add user** (Ajouter un utilisateur)
7. Entrer l'email de Léa : `leavengeons@gmail.com`
8. Choisir son mot de passe : `d0M41n-leah` et cliquer sur **Ajouter un utilisateur**

### Étape 4 — Configurer les règles Firestore (Le Cadenas)

Dans **Firestore Database → Règles**, copier et coller ce code exact pour verrouiller la base de données :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
    match /appointments/{doc} {
      // Seule l'utilisatrice avec son mot de passe peut lire et écrire
      allow read, write: if request.auth != null;
    }
  }
}
```
Cliquer sur **Publier**.

### Étape 5 — Récupérer les clés Firebase

1. Dans le menu Firebase : **Paramètres du projet → Général**
2. Descendre jusqu'à "Vos applications"
3. Cliquer sur l'icône **Web `</>`**
4. Enregistrer l'application avec le nom `nailbook`
5. **Copier les valeurs** de `firebaseConfig`

### Étape 6 — Mettre à jour la config

Ouvrir le fichier `js/config.js` et vérifier que `auth.email` correspond bien, puis remplacer la section `firebase` :

```javascript
firebase: {
  apiKey:            'AIzaSy...',       // ← Ta vraie clé
  authDomain:        'nailbook-lv.firebaseapp.com',
  projectId:         'nailbook-lv',
  storageBucket:     'nailbook-lv.appspot.com',
  messagingSenderId: '12345...',
  appId:             '1:12345...',
},
```

---

## 🚀 Déploiement GitHub Pages

### Étape 1 — Créer le repository GitHub

1. Aller sur [github.com](https://github.com) → **New repository**
2. Nom : `nailbook` (ou autre)
3. **Privé** (Private) ✅
4. Pas de README (on en a déjà un)
5. Cliquer **Create repository**

### Étape 2 — Pousser le code

Dans un terminal, depuis le dossier du projet :

```bash
git init
git add .
git commit -m "NailBook v1.0 — Nails By LV"
git branch -M main
git remote add origin https://github.com/TON_USERNAME/nailbook.git
git push -u origin main
```

### Étape 3 — Activer GitHub Pages

1. Aller dans **Settings** du repository
2. Cliquer **Pages** dans le menu de gauche
3. Source : **Deploy from a branch**
4. Branch : `main` / `/ (root)`
5. Cliquer **Save**

### Étape 4 — Accéder à l'app

L'URL sera : `https://TON_USERNAME.github.io/nailbook/`

> ⚠️ Il faut parfois attendre 1-2 minutes après le premier déploiement.

---

## 📱 Installer comme une app sur iPhone

1. Ouvrir l'URL dans **Safari** (pas Chrome)
2. Taper sur le bouton **Partager** (carré avec flèche)
3. Choisir **"Sur l'écran d'accueil"**
4. Taper **"Ajouter"**

L'app apparaîtra sur ton écran d'accueil comme une vraie application !

---

## 📄 Factures PDF

Les factures générées sont conformes aux obligations légales françaises pour les auto-entrepreneurs :
- ✅ SIREN / SIRET
- ✅ Numérotation chronologique continue
- ✅ Mention TVA non applicable (art. 293 B du CGI)
- ✅ Conditions de règlement et pénalités de retard
- ✅ Peut servir de **livre des recettes** (art. 50-0 du CGI)

> ⚠️ À vérifier avec ton comptable pour la conformité de ta situation.

---

## 💾 Données

- **Sans Firebase** : données stockées localement sur chaque appareil (pas de sync)
- **Avec Firebase** : données synchronisées en temps réel entre tous les appareils
- Sauvegarde manuelle possible : Réglages → **Exporter les données** (fichier JSON)

---

## 🔧 SIRET

Le SIRET complet (14 chiffres) doit être mis à jour dans `js/config.js` :

```javascript
siret: '909 529 745 XXXXX',  // ← Compléter les 5 derniers chiffres (NIC)
```

Trouver votre SIRET sur : [annuaire-entreprises.data.gouv.fr](https://annuaire-entreprises.data.gouv.fr)

---

*NailBook v1.0 — Développé pour Nails By LV*
