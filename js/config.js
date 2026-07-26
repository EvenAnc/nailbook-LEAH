// ══════════════════════════════════════════════════
// NailBook — Configuration Entreprise & Auth
// Nails By LV — RETIRE
// ══════════════════════════════════════════════════

const CONFIG = {
  // ─── ENTREPRISE ────────────────────────────────
  business: {
    name:        'Nails By LV',
    ownerName:   'RETIRE',
    legalStatus: 'Entrepreneur Individuel',
    siren:       'RETIRE',
    // SIRET = SIREN (9 chiffres) + NIC (5 chiffres)
    // À compléter sur https://www.infogreffe.fr une fois disponible
    siret:       'RETIRE', // ← À vérifier/compléter
    address:     'RETIRE',
    zipCity:     'RETIRE',
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
  // Email utilisé pour la connexion Firebase Auth
  auth: {
    email: 'RETIRE',
    // Le mot de passe n'est JAMAIS stocké ici — il est géré uniquement par Firebase Auth
    passwordHash: 'RETIRE', // fallback hors-ligne uniquement
  },

  // ─── FIREBASE ──────────────────────────────────
  // Note: la clé API Firebase Web est publique par conception.
  // La sécurité repose sur les règles Firestore (lecture/écriture interdit sans auth)
  firebase: {
    apiKey:            'AIzaSyAd0k10MwdsAvSwPkJUsTnzuOeF0CgIxx4',
    authDomain:        'compta-nails-leah.firebaseapp.com',
    projectId:         'compta-nails-leah',
    storageBucket:     'compta-nails-leah.firebasestorage.app',
    messagingSenderId: '418301179197',
    appId:             '1:418301179197:web:efee83b873fd3fe4418154',
  },

  // ─── COULEURS PRESTATIONS ──────────────────────
  serviceColors: {
    pose_americaine:        { color: '#E8764A', bg: '#FFE8E0', emoji: '🇺🇸', label: 'Pose Américaine' },
    gel:                    { color: '#8B5CF6', bg: '#EDE0FF', emoji: '💎', label: 'Gel' },
    depose:                 { color: '#9CA3AF', bg: '#F0F0F0', emoji: '🗑️', label: 'Dépose' },
    gainage:                { color: '#D4A017', bg: '#FFF8E0', emoji: '🛡️', label: 'Gaînage' },
    renforcement:           { color: '#10B981', bg: '#E0FFF0', emoji: '💪', label: 'Renforcement' },
    semi:                   { color: '#3B82F6', bg: '#E0F4FF', emoji: '🌸', label: 'Semi' },
    depose_pose_americaine: { color: '#C0522A', bg: '#FFD5C5', emoji: '✨', label: 'Dépose + Pose Américaine' },
    remplissage:            { color: '#0E9494', bg: '#D6F4F4', emoji: '💅', label: 'Remplissage' },
    depose_exterieur:       { color: '#6B7280', bg: '#E5E7EB', emoji: '✂️', label: 'Dépose Extérieur' },
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
