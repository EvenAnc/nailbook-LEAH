# 💅 NailBook

Application privée de gestion des rendez-vous et comptabilité pour prothésiste ongulaire.

---

## 🔐 Sécurité

L'application est protégée par un système d'authentification robuste (Firebase Auth). L'accès est strictement réservé à l'administratrice. Les données sont sécurisées et inaccessibles publiquement.

---

## 🚀 Fonctionnalités principales

- **Planning interactif** : Gestion des rendez-vous (vue mois, vue jour).
- **Historique clients** : Suivi des prestations par client.
- **Tableau de bord financier** : Suivi du chiffre d'affaires, statistiques annuelles et mensuelles.
- **Export Comptable** : Génération automatique de factures PDF conformes aux obligations légales des auto-entrepreneurs (Livre des recettes).
- **Synchronisation temps réel** : Base de données sécurisée sur le cloud (Firebase Firestore) pour retrouver ses données sur tous ses appareils (PC, Mobile, Tablette).

---

## 📱 Utilisation sur mobile (PWA)

L'application est conçue pour fonctionner comme une véritable application native sur smartphone :
1. Ouvrir l'URL sécurisée depuis Safari (iOS) ou Chrome (Android).
2. Ajouter à l'écran d'accueil ("Partager" > "Sur l'écran d'accueil").
3. L'application fonctionnera en plein écran, avec support hors-ligne.

---

## 💻 Tech Stack

- **Frontend** : HTML5, CSS3, Vanilla JavaScript (ES6+).
- **Backend / BDD** : Firebase Authentication, Firebase Firestore.
- **Génération PDF** : pdfMake.
- **PWA** : Service Worker natif (Cache-first strategy).

---

*Application développée sur mesure.*
