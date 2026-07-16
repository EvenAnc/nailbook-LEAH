// ══════════════════════════════════════════════════
// NailBook — Configuration Entreprise & Auth
// Nails By LV — Vengeons Léa Laetitia
// ══════════════════════════════════════════════════

const CONFIG = {
  // ─── ENTREPRISE ────────────────────────────────
  business: {
    name:        'Nails By LV',
    ownerName:   'Vengeons Léa Laetitia',
    legalStatus: 'Entrepreneur Individuel',
    siren:       '909 529 745',
    // SIRET = SIREN (9 chiffres) + NIC (5 chiffres)
    // À compléter sur https://www.infogreffe.fr une fois disponible
    siret:       '909 529 745 00011', // ← À vérifier/compléter
    address:     '18 Rue de l\'Orient',
    zipCity:     '31000 Toulouse',
    country:     'France',
    // Numéro de TVA intracommunautaire non applicable (franchise de base)
    vatNote:     'TVA non applicable, art. 293 B du CGI',
  },

  // ─── PARAMÈTRES MÉTIER ─────────────────────────
  defaults: {
    depositAmount:  15,      // € — acompte fixe
    durationMin:    90,      // minutes — durée standard 1h30
    invoicePrefix:  'REC',   // préfixe numéro de facture
    lateRate:       '3 fois le taux d\'intérêt légal en vigueur',
  },

  // ─── AUTHENTIFICATION ──────────────────────────
  // Email de connexion autorisé (à créer dans Firebase Authentication)
  auth: {
    email: 'leavengeons@gmail.com',
    passwordHash: '12bbb2c5c0885fe3f9f898ca4b3e759bffa30fdeed20162ecfc3aab727b99dfa',
  },

  // ─── FIREBASE ──────────────────────────────────
  // Configuration Firebase — À remplacer avec vos propres clés
  // Créer un projet sur https://console.firebase.google.com
  firebase: {
    apiKey:            'FIREBASE_API_KEY',
    authDomain:        'FIREBASE_PROJECT_ID.firebaseapp.com',
    projectId:         'FIREBASE_PROJECT_ID',
    storageBucket:     'FIREBASE_PROJECT_ID.appspot.com',
    messagingSenderId: 'FIREBASE_SENDER_ID',
    appId:             'FIREBASE_APP_ID',
  },

  // ─── COULEURS PRESTATIONS ──────────────────────
  serviceColors: {
    pose_americaine: { color: '#E8764A', bg: '#FFE8E0', emoji: '🇺🇸', label: 'Pose Américaine' },
    gel:             { color: '#8B5CF6', bg: '#EDE0FF', emoji: '💎', label: 'Gel' },
    depose:          { color: '#9CA3AF', bg: '#F0F0F0', emoji: '🗑️', label: 'Dépose' },
    gainage:         { color: '#D4A017', bg: '#FFF8E0', emoji: '🛡️', label: 'Gainage' },
    renforcement:    { color: '#10B981', bg: '#E0FFF0', emoji: '💪', label: 'Renforcement' },
    semi:            { color: '#3B82F6', bg: '#E0F4FF', emoji: '🌸', label: 'Semi' },
  },

  // ─── STATUTS ───────────────────────────────────
  statusLabels: {
    pending:   { label: 'En attente', color: '#D47A1A', bg: '#FEF3E2' },
    confirmed: { label: 'Confirmé',   color: '#2D9E5F', bg: '#E8F5EE' },
    cancelled: { label: 'Annulé',     color: '#D94F4F', bg: '#FCEAEA' },
  },

  paymentLabels: {
    wero:     'Wero',
    especes:  'Espèces',
    non_verse: 'Non versé',
    non_regle: 'Non réglé',
  },
};

// Expose globally
window.CONFIG = CONFIG;
