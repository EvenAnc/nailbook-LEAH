// ══════════════════════════════════════════════════
// NailBook — Application principale
// ══════════════════════════════════════════════════

'use strict';

// app.js is loaded dynamically after DOM is ready & CONFIG is already available
// initApp() is called at the very bottom of this file after all definitions.


// ══════════════════════════════════════════════════
// STORE — Couche données (Firebase + localStorage fallback)
// ══════════════════════════════════════════════════
const Store = (() => {
  let db = null;
  let appointments = [];
  let listeners = [];
  let useFirebase = false;

  // Clé localStorage
  const LS_KEY = 'nailbook_appointments';
  const LS_INVOICE_KEY = 'nailbook_invoice_counter';
  const LS_PWD_KEY = 'nailbook_password_hash';

  function subscribe(fn) { listeners.push(fn); }

  function notify() { listeners.forEach(fn => fn(appointments)); }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  function getInvoiceCounter() {
    return parseInt(localStorage.getItem(LS_INVOICE_KEY) || '0', 10);
  }

  function incrementInvoiceCounter() {
    const n = getInvoiceCounter() + 1;
    localStorage.setItem(LS_INVOICE_KEY, n.toString());
    return n;
  }

  // ── localStorage operations ──
  function loadCustomSettings() {
    try {
      const customBiz = JSON.parse(localStorage.getItem('nailbook_biz_settings'));
      if (customBiz) {
        Object.assign(CONFIG.business, customBiz);
        if(document.getElementById('set-val-name')) document.getElementById('set-val-name').textContent = customBiz.name || CONFIG.business.name;
        if(document.getElementById('set-val-owner')) document.getElementById('set-val-owner').textContent = customBiz.ownerName || CONFIG.business.ownerName;
        if(document.getElementById('set-val-siren')) document.getElementById('set-val-siren').textContent = customBiz.siren || CONFIG.business.siren;
        if(document.getElementById('set-val-address')) document.getElementById('set-val-address').textContent = customBiz.address || CONFIG.business.address;
        
        const dur = customBiz.defaultDuration || 90;
        if(document.getElementById('set-val-duration')) document.getElementById('set-val-duration').textContent = dur >= 60 ? Math.floor(dur/60) + 'h' + (dur%60||'00') : dur + ' min';
        
        const dep = customBiz.defaultDeposit !== undefined ? customBiz.defaultDeposit : 15;
        if(document.getElementById('set-val-deposit')) document.getElementById('set-val-deposit').textContent = dep + ' €';
      }
    } catch(e){}
  }
  loadCustomSettings();

  function lsLoad() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      appointments = raw ? JSON.parse(raw) : [];
    } catch { appointments = []; }
    notify();
  }

  function lsSave() {
    localStorage.setItem(LS_KEY, JSON.stringify(appointments));
  }

  // ── Firebase operations ──
  async function fbInit() {
    try {
      const m = window.__fbModules;
      if (!m || CONFIG.firebase.apiKey === 'FIREBASE_API_KEY') {
        return false;
      }
      const app = m.initializeApp(CONFIG.firebase);
      db = m.getFirestore(app);

      // Real-time listener
      const q = m.query(m.collection(db, 'appointments'), m.orderBy('date', 'asc'));
      m.onSnapshot(q, snapshot => {
        appointments = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        notify();
      });

      useFirebase = true;
      return true;
    } catch (e) {
      console.warn('Firebase init failed, using localStorage', e);
      return false;
    }
  }

  async function fbAdd(appt) {
    const m = window.__fbModules;
    const ref = await m.addDoc(m.collection(db, 'appointments'), appt);
    return ref.id;
  }

  async function fbUpdate(id, appt) {
    const m = window.__fbModules;
    await m.updateDoc(m.doc(db, 'appointments', id), appt);
  }

  async function fbDelete(id) {
    const m = window.__fbModules;
    await m.deleteDoc(m.doc(db, 'appointments', id));
  }

  // ── Password management ──
  function getPasswordHash() {
    return localStorage.getItem(LS_PWD_KEY) || CONFIG.auth.passwordHash;
  }

  function setPasswordHash(hash) {
    localStorage.setItem(LS_PWD_KEY, hash);
  }

  // ── Public API ──
  return {
    subscribe,
    getAll: () => appointments,
    getInvoiceCounter,
    incrementInvoiceCounter,
    getPasswordHash,
    setPasswordHash,

    async init() {
      const fbOk = await fbInit();
      if (!fbOk) lsLoad();
    },

    async add(appt) {
      appt.createdAt = new Date().toISOString();
      appt.updatedAt = new Date().toISOString();
      if (useFirebase) {
        await fbAdd(appt);
      } else {
        appt.id = generateId();
        appointments.push(appt);
        lsSave(); notify();
      }
    },

    async update(id, appt) {
      appt.updatedAt = new Date().toISOString();
      if (useFirebase) {
        await fbUpdate(id, appt);
      } else {
        const i = appointments.findIndex(a => a.id === id);
        if (i >= 0) { appointments[i] = { ...appointments[i], ...appt }; }
        lsSave(); notify();
      }
    },

    async delete(id) {
      if (useFirebase) {
        await fbDelete(id);
      } else {
        appointments = appointments.filter(a => a.id !== id);
        lsSave(); notify();
      }
    },

    export() {
      return JSON.stringify(appointments, null, 2);
    },

    import(json) {
      try {
        const data = JSON.parse(json);
        if (!Array.isArray(data)) throw new Error('Invalid format');
        appointments = data;
        lsSave(); notify();
        return true;
      } catch { return false; }
    },

    getByMonth(year, month) {
      return appointments.filter(a => {
        if (!a.date) return false;
        const [y, m] = a.date.split('-').map(Number);
        return y === year && m - 1 === month;
      });
    },

    getByDate(dateStr) {
      return appointments.filter(a => a.date === dateStr);
    },

    getClients() {
      const map = new Map();
      appointments.forEach(a => {
        const key = `${a.clientFirstName}|${a.clientLastName}|${a.clientInstagram || ''}`;
        if (!map.has(key)) {
          map.set(key, {
            firstName: a.clientFirstName,
            lastName:  a.clientLastName,
            instagram: a.clientInstagram || '',
            appointments: [],
          });
        }
        map.get(key).appointments.push(a);
      });
      return Array.from(map.values()).sort((a, b) =>
        a.lastName.localeCompare(b.lastName, 'fr'));
    },
  };
})();

// ══════════════════════════════════════════════════
// AUTH MODULE
// ══════════════════════════════════════════════════
const Auth = (() => {
  const SESSION_KEY = 'nailbook_session';
  const LOCK_KEY = 'nailbook_lock';
  const ATTEMPTS_KEY = 'nailbook_attempts';

  let fbAuthInstance = null;

  function initFbAuth() {
    const m = window.__fbModules;
    if (m && CONFIG.firebase.apiKey !== 'FIREBASE_API_KEY') {
      const app = m.initializeApp(CONFIG.firebase);
      fbAuthInstance = m.getAuth(app);
    }
  }

  function onAuthStateReady(callback) {
    initFbAuth();
    if (fbAuthInstance) {
      window.__fbModules.onAuthStateChanged(fbAuthInstance, user => {
        if (user) {
          sessionStorage.setItem(SESSION_KEY, 'authenticated');
        } else {
          sessionStorage.removeItem(SESSION_KEY);
        }
        callback(!!user);
      });
    } else {
      callback(sessionStorage.getItem(SESSION_KEY) === 'authenticated');
    }
  }

  async function hashPassword(pwd) {
    const buf = await crypto.subtle.digest(
      'SHA-256', new TextEncoder().encode(pwd)
    );
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function login() { 
    sessionStorage.setItem(SESSION_KEY, 'authenticated'); 
    localStorage.removeItem(ATTEMPTS_KEY);
    localStorage.removeItem(LOCK_KEY);
  }
  
  async function logout() { 
    if (fbAuthInstance) {
      await window.__fbModules.signOut(fbAuthInstance);
    }
    sessionStorage.removeItem(SESSION_KEY); 
  }

  function checkLock() {
    if (fbAuthInstance) return 0; // Firebase gère son propre bruteforce (bloque le compte)
    const lockUntil = parseInt(localStorage.getItem(LOCK_KEY) || '0', 10);
    if (lockUntil > Date.now()) {
      return Math.ceil((lockUntil - Date.now()) / 1000);
    }
    return 0;
  }

  function recordAttempt(success) {
    if (fbAuthInstance) return; // Inutile si Firebase géré
    if (success) {
      localStorage.removeItem(ATTEMPTS_KEY);
      localStorage.removeItem(LOCK_KEY);
    } else {
      let attempts = parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0', 10) + 1;
      localStorage.setItem(ATTEMPTS_KEY, attempts.toString());
      if (attempts >= 5) {
        const lockMinutes = Math.pow(2, attempts - 5);
        localStorage.setItem(LOCK_KEY, (Date.now() + lockMinutes * 60000).toString());
      }
    }
  }

  async function verify(pwd) {
    if (fbAuthInstance) {
      try {
        await window.__fbModules.signInWithEmailAndPassword(fbAuthInstance, CONFIG.auth.email, pwd);
        return { ok: true, locked: false };
      } catch (err) {
        if (err.code === 'auth/too-many-requests') return { ok: false, locked: true };
        return { ok: false, locked: false };
      }
    } else {
      // Fallback mode hors-ligne sans Firebase
      if (checkLock() > 0) return { ok: false, locked: true };
      const hash = await hashPassword(pwd);
      const ok = hash === Store.getPasswordHash();
      recordAttempt(ok);
      return { ok, locked: false };
    }
  }

  async function changePassword(currentPwd, newPwd) {
    // Note: Modifier un mot de passe Firebase via Web nécessite plus de code (re-authentication).
    // Si Firebase, l'utilisateur doit le changer depuis la console Firebase pour plus de sécurité.
    if (fbAuthInstance) return false; 
    
    const res = await verify(currentPwd);
    if (!res.ok) return false;
    const newHash = await hashPassword(newPwd);
    Store.setPasswordHash(newHash);
    return true;
  }

  return { onAuthStateReady, login, logout, verify, changePassword, checkLock };
})();

// ══════════════════════════════════════════════════
// UI HELPERS
// ══════════════════════════════════════════════════
const UI = (() => {
  function toast(msg, type = 'default', duration = 3000) {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast${type !== 'default' ? ' toast-' + type : ''}`;
    const icons = { success: '✅', error: '❌', warning: '⚠️' };
    t.textContent = (icons[type] || '💅') + ' ' + msg;
    container.appendChild(t);
    setTimeout(() => {
      t.style.animation = 'none';
      t.style.opacity = '0';
      t.style.transform = 'translateY(12px)';
      t.style.transition = 'all .3s ease';
      setTimeout(() => t.remove(), 300);
    }, duration);
  }

  function confirm(icon, title, message, okLabel = 'Confirmer', okClass = 'btn-danger') {
    return new Promise(resolve => {
      const dialog = document.getElementById('confirm-dialog');
      document.getElementById('confirm-icon').textContent = icon;
      document.getElementById('confirm-title').textContent = title;
      document.getElementById('confirm-message').textContent = message;
      const okBtn = document.getElementById('confirm-ok');
      okBtn.textContent = okLabel;
      okBtn.className = `btn ${okClass}`;
      dialog.classList.remove('hidden');

      function cleanup() { dialog.classList.add('hidden'); }

      document.getElementById('confirm-cancel').onclick = () => { cleanup(); resolve(false); };
      okBtn.onclick = () => { cleanup(); resolve(true); };
    });
  }

  function formatCurrency(amount) {
    if (!amount && amount !== 0) return '—';
    return Number(amount).toLocaleString('fr-FR', {
      style: 'currency', currency: 'EUR', minimumFractionDigits: 2
    });
  }

  function formatDate(dateStr, options = {}) {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', ...options });
  }

  function formatTime(timeStr) {
    if (!timeStr) return '';
    return timeStr.replace(':', 'h');
  }

  function formatDuration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h${m.toString().padStart(2, '0')}`;
  }

  function getMonthName(year, month) {
    return new Date(year, month, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  }

  return { toast, confirm, formatCurrency, formatDate, formatTime, formatDuration, getMonthName, capitalize };
})();

// ══════════════════════════════════════════════════
// CALENDAR MODULE
// ══════════════════════════════════════════════════
const Calendar = (() => {
  let currentYear  = new Date().getFullYear();
  let currentMonth = new Date().getMonth();
  let selectedDate = null;
  let currentView  = 'month'; // 'month' | 'day'
  let dayViewDate  = new Date();

  function init() {
    document.getElementById('cal-prev').addEventListener('click', () => {
      if (currentMonth === 0) { currentMonth = 11; currentYear--; }
      else currentMonth--;
      render();
    });
    document.getElementById('cal-next').addEventListener('click', () => {
      if (currentMonth === 11) { currentMonth = 0; currentYear++; }
      else currentMonth++;
      render();
    });
    document.getElementById('cal-today').addEventListener('click', () => {
      const now = new Date();
      currentYear = now.getFullYear();
      currentMonth = now.getMonth();
      render();
    });

    document.getElementById('view-month-btn').addEventListener('click', () => switchView('month'));
    document.getElementById('view-day-btn').addEventListener('click', () => {
      dayViewDate = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
      switchView('day');
    });

    document.getElementById('day-back').addEventListener('click', () => switchView('month'));

    document.getElementById('day-prev').addEventListener('click', () => {
      dayViewDate.setDate(dayViewDate.getDate() - 1);
      renderDayView();
    });
    document.getElementById('day-next').addEventListener('click', () => {
      dayViewDate.setDate(dayViewDate.getDate() + 1);
      renderDayView();
    });
  }

  function switchView(view) {
    currentView = view;
    document.getElementById('view-month-btn').classList.toggle('active', view === 'month');
    document.getElementById('view-day-btn').classList.toggle('active', view === 'day');
    document.getElementById('month-view').classList.toggle('hidden', view === 'day');
    document.getElementById('day-view').classList.toggle('hidden', view === 'month');
    document.getElementById('calendar-nav').classList.toggle('hidden', view === 'day');
    if (view === 'day') renderDayView();
  }

  function render() {
    document.getElementById('calendar-month-title').textContent =
      UI.capitalize(UI.getMonthName(currentYear, currentMonth));

    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    // First day of month (0=Sun → convert to Mon-start)
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const startOffset = (firstDay === 0 ? 6 : firstDay - 1);
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevDays = new Date(currentYear, currentMonth, 0).getDate();

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const allAppts = Store.getAll();

    // Previous month days
    for (let i = startOffset - 1; i >= 0; i--) {
      grid.appendChild(createDayCell(currentYear, currentMonth - 1, prevDays - i, true, allAppts, todayStr));
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      grid.appendChild(createDayCell(currentYear, currentMonth, d, false, allAppts, todayStr));
    }

    // Next month fill
    const total = startOffset + daysInMonth;
    const remainder = total % 7 === 0 ? 0 : 7 - (total % 7);
    for (let d = 1; d <= remainder; d++) {
      grid.appendChild(createDayCell(currentYear, currentMonth + 1, d, true, allAppts, todayStr));
    }
  }

  function createDayCell(year, month, day, isOther, allAppts, todayStr) {
    const date = new Date(year, month, day);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const dayAppts = allAppts.filter(a => a.date === dateStr && a.status !== 'cancelled');

    const cell = document.createElement('div');
    cell.className = `cal-day${isOther ? ' other-month' : ''}${dateStr === todayStr ? ' today' : ''}`;
    cell.dataset.date = dateStr;

    const numEl = document.createElement('div');
    numEl.className = 'cal-day-num';
    numEl.textContent = day;
    cell.appendChild(numEl);

    if (dayAppts.length > 0) {
      const dotsEl = document.createElement('div');
      dotsEl.className = 'cal-day-dots';
      dayAppts.slice(0, 6).forEach(a => {
        const dot = document.createElement('div');
        dot.className = 'cal-dot';
        const svc = CONFIG.serviceColors[a.serviceType];
        dot.style.backgroundColor = svc ? svc.color : '#B76E79';
        dotsEl.appendChild(dot);
      });
      cell.appendChild(dotsEl);

      if (dayAppts.length > 1) {
        const cnt = document.createElement('div');
        cnt.className = 'cal-day-rdv-count';
        cnt.textContent = dayAppts.length;
        cell.appendChild(cnt);
      }
    }

    cell.addEventListener('click', () => {
      selectedDate = dateStr;
      dayViewDate = new Date(dateStr + 'T00:00:00');
      switchView('day');
    });

    return cell;
  }

  function renderDayView() {
    const dateStr = `${dayViewDate.getFullYear()}-${String(dayViewDate.getMonth() + 1).padStart(2, '0')}-${String(dayViewDate.getDate()).padStart(2, '0')}`;
    const appts = Store.getByDate(dateStr).sort((a, b) => a.time.localeCompare(b.time));

    document.getElementById('day-view-title').textContent =
      UI.capitalize(dayViewDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }));

    const timeline = document.getElementById('timeline');
    timeline.innerHTML = '';
    timeline.style.position = 'relative';

    // Build timeline 8h-20h (background grid)
    for (let h = 8; h <= 20; h++) {
      const slot = document.createElement('div');
      slot.className = 'timeline-slot';
      slot.style.height = '60px'; // 1 min = 1 px
      slot.style.boxSizing = 'border-box';
      slot.style.borderBottom = '1px solid var(--border-light)';
      slot.style.display = 'flex';

      const timeEl = document.createElement('div');
      timeEl.className = 'timeline-time';
      timeEl.textContent = `${h}:00`;
      
      slot.appendChild(timeEl);
      timeline.appendChild(slot);
    }

    const eventsContainer = document.createElement('div');
    eventsContainer.className = 'timeline-events';
    eventsContainer.style.position = 'absolute';
    eventsContainer.style.top = '0';
    eventsContainer.style.left = '60px';
    eventsContainer.style.right = '16px';
    eventsContainer.style.bottom = '0';
    timeline.appendChild(eventsContainer);

    // Calculate layout for overlapping appointments
    const placed = [];
    appts.forEach(appt => {
      const [h, m] = (appt.time || '09:00').split(':').map(Number);
      if (h < 8 || h > 20) return;
      const start = (h - 8) * 60 + m;
      const duration = appt.duration || 90;
      const end = start + duration;

      const overlaps = placed.filter(p => start < p.end && end > p.start);
      let col = 0;
      while (overlaps.some(p => p.col === col)) col++;

      placed.push({ start, end, col, appt });
    });

    placed.forEach(p => {
      const overlaps = placed.filter(o => p.start < o.end && p.end > o.start);
      const maxCol = overlaps.length ? Math.max(...overlaps.map(o => o.col)) : 0;
      
      const block = createApptBlock(p.appt);
      block.style.position = 'absolute';
      block.style.top = `${p.start}px`;
      block.style.height = `${p.end - p.start}px`;
      
      const totalCols = maxCol + 1;
      const width = 100 / totalCols;
      block.style.width = `calc(${width}% - 4px)`;
      block.style.left = `calc(${p.col * width}%)`;
      
      block.style.margin = '0';
      block.style.zIndex = '10';
      block.style.overflow = 'hidden';
      block.style.boxSizing = 'border-box';

      eventsContainer.appendChild(block);
    });

    if (appts.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `
        <div class="empty-state-icon">📅</div>
        <div class="empty-state-text">Aucun rendez-vous ce jour</div>
        <div class="empty-state-sub">Appuyez sur + pour en ajouter un</div>
      `;
      // Put empty state above grid
      empty.style.position = 'relative';
      empty.style.zIndex = '20';
      empty.style.background = 'var(--bg-primary)';
      timeline.appendChild(empty);
    }
  }

  function createApptBlock(appt) {
    const svc = CONFIG.serviceColors[appt.serviceType] || { color: '#B76E79', bg: '#F4D4D8', emoji: '💅', label: appt.serviceType };
    const block = document.createElement('div');
    block.className = `appt-block service-${appt.serviceType}${appt.status === 'cancelled' ? ' cancelled' : ''}`;
    block.style.borderColor = svc.color;
    block.style.background = svc.bg;

    const status = CONFIG.statusLabels[appt.status] || CONFIG.statusLabels.pending;
    block.innerHTML = `
      <div class="appt-block-name">${appt.clientFirstName} ${appt.clientLastName}</div>
      <div class="appt-block-info">
        ${UI.formatTime(appt.time)} · ${UI.formatDuration(appt.duration || 90)} · ${svc.emoji} ${svc.label}
        · <span style="color:${status.color};font-weight:600">${status.label}</span>
        · ${UI.formatCurrency(appt.price)}
      </div>
    `;
    block.addEventListener('click', () => AppointmentModal.open(appt.id));
    return block;
  }

  return {
    init,
    render,
    renderDayView,
    switchView,
    refresh() {
      if (currentView === 'month') render();
      else renderDayView();
    },
    getCurrentDate: () => ({
      year: currentYear, month: currentMonth,
      dayViewDate: `${dayViewDate.getFullYear()}-${String(dayViewDate.getMonth() + 1).padStart(2, '0')}-${String(dayViewDate.getDate()).padStart(2, '0')}`,
    }),
  };
})();

// ══════════════════════════════════════════════════
// APPOINTMENT MODAL
// ══════════════════════════════════════════════════
const AppointmentModal = (() => {
  let currentId = null;

  // Segment controls state
  const segments = {
    'deposit-payment': null,
    'appt-status': 'pending',
    'service-payment': null,
  };

  function init() {
    // Close
    document.getElementById('modal-close').addEventListener('click', close);
    document.getElementById('modal-cancel-btn').addEventListener('click', close);
    document.getElementById('appointment-modal').addEventListener('click', e => {
      if (e.target === e.currentTarget) close();
    });

    // Service chips
    document.querySelectorAll('.service-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.service-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Segment controls
    document.querySelectorAll('.segment-control').forEach(ctrl => {
      ctrl.querySelectorAll('.segment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          ctrl.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('segment-btn-active'));
          btn.classList.add('segment-btn-active');
          segments[ctrl.id] = btn.dataset.value;
        });
      });
    });

    // Tips toggle
    document.getElementById('appt-has-tips').addEventListener('change', e => {
      document.getElementById('tips-amount-group').classList.toggle('hidden', !e.target.checked);
    });

    // Duration custom
    document.getElementById('appt-duration').addEventListener('change', e => {
      document.getElementById('duration-custom-group').classList.toggle('hidden', e.target.value !== 'custom');
    });

    // Autocomplete
    setupAutocomplete('appt-firstname', 'autocomplete-firstname', 'firstName');
    setupAutocomplete('appt-lastname',  'autocomplete-lastname',  'lastName');

    // Form submit
    document.getElementById('appointment-form').addEventListener('submit', async e => {
      e.preventDefault();
      await save();
    });

    // Delete
    document.getElementById('delete-appt-btn').addEventListener('click', async () => {
      const ok = await UI.confirm('🗑️', 'Supprimer ce rendez-vous ?',
        'Cette action est irréversible. Le rendez-vous sera supprimé du calendrier et de la facture.', 'Supprimer', 'btn-danger');
      if (ok) {
        await Store.delete(currentId);
        close();
        UI.toast('Rendez-vous supprimé', 'success');
      }
    });
  }

  function setupAutocomplete(inputId, listId, field) {
    const input = document.getElementById(inputId);
    const list  = document.getElementById(listId);

    input.addEventListener('input', () => {
      const val = input.value.trim().toLowerCase();
      if (!val) { list.classList.add('hidden'); return; }

      const clients = Store.getClients();
      const matches = clients
        .filter(c => c[field].toLowerCase().startsWith(val))
        .slice(0, 5);

      if (matches.length === 0) { list.classList.add('hidden'); return; }

      list.innerHTML = '';
      matches.forEach(c => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.textContent = `${c.firstName} ${c.lastName}`;
        item.addEventListener('click', () => {
          document.getElementById('appt-firstname').value = c.firstName;
          document.getElementById('appt-lastname').value  = c.lastName;
          if (c.instagram) {
            document.getElementById('appt-instagram').value = c.instagram.replace('@', '');
          }
          list.classList.add('hidden');
          document.getElementById('autocomplete-firstname').classList.add('hidden');
          document.getElementById('autocomplete-lastname').classList.add('hidden');
        });
        list.appendChild(item);
      });
      list.classList.remove('hidden');
    });

    document.addEventListener('click', e => {
      if (!input.contains(e.target) && !list.contains(e.target)) {
        list.classList.add('hidden');
      }
    });
  }

  function setSegment(ctrlId, value) {
    const ctrl = document.getElementById(ctrlId);
    if (!ctrl) return;
    ctrl.querySelectorAll('.segment-btn').forEach(btn => {
      btn.classList.toggle('segment-btn-active', btn.dataset.value === value);
    });
    segments[ctrlId] = value;
  }

  function open(apptId = null, prefillDate = null) {
    currentId = apptId;
    const modal = document.getElementById('appointment-modal');
    const form  = document.getElementById('appointment-form');

    form.reset();
    document.getElementById('appt-id').value = '';
    document.getElementById('tips-amount-group').classList.add('hidden');
    document.getElementById('duration-custom-group').classList.add('hidden');
    document.getElementById('delete-appt-btn').style.display = 'none';
    document.querySelectorAll('.service-chip').forEach(b => b.classList.remove('active'));

    // Reset segments
    setSegment('deposit-payment', null);
    setSegment('appt-status', 'pending');
    setSegment('service-payment', null);

    if (apptId) {
      // Edit mode
      const appt = Store.getAll().find(a => a.id === apptId);
      if (!appt) return;

      document.getElementById('modal-title').textContent = 'Modifier le rendez-vous';
      document.getElementById('delete-appt-btn').style.display = 'flex';
      document.getElementById('save-appt-btn').textContent = 'Enregistrer';

      document.getElementById('appt-id').value           = appt.id;
      document.getElementById('appt-firstname').value    = appt.clientFirstName || '';
      document.getElementById('appt-lastname').value     = appt.clientLastName  || '';
      document.getElementById('appt-instagram').value    = (appt.clientInstagram || '').replace('@', '');
      document.getElementById('appt-price').value        = appt.price || '';
      document.getElementById('appt-date').value         = appt.date  || '';
      document.getElementById('appt-time').value         = appt.time  || '';
      document.getElementById('appt-has-tips').checked   = !!appt.hasTips;
      document.getElementById('appt-tips-amount').value  = appt.tipsAmount || '';
      if (appt.hasTips) document.getElementById('tips-amount-group').classList.remove('hidden');

      // Duration
      const dur = appt.duration || 90;
      const durSel = document.getElementById('appt-duration');
      const stdValues = ['30','60','90','120','150','180'];
      if (stdValues.includes(dur.toString())) {
        durSel.value = dur.toString();
      } else {
        durSel.value = 'custom';
        document.getElementById('appt-duration-custom').value = dur;
        document.getElementById('duration-custom-group').classList.remove('hidden');
      }

      // Service chip
      const chip = document.querySelector(`.service-chip[data-value="${appt.serviceType}"]`);
      if (chip) chip.classList.add('active');

      // Segments
      setSegment('deposit-payment', appt.depositPayment || null);
      setSegment('appt-status',     appt.status || 'pending');
      setSegment('service-payment', appt.servicePayment || null);

    } else {
      // New mode
      document.getElementById('modal-title').textContent = 'Nouveau rendez-vous';
      document.getElementById('save-appt-btn').textContent = 'Enregistrer';

      // Default date
      const d = new Date();
      const dateStr = prefillDate || `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      document.getElementById('appt-date').value = dateStr;
      document.getElementById('appt-time').value = '09:00';
      document.getElementById('appt-duration').value = CONFIG.business.defaultDuration ? CONFIG.business.defaultDuration.toString() : '90';
    }

    modal.classList.remove('hidden');
    setTimeout(() => document.getElementById('appt-firstname').focus(), 300);
  }

  function close() {
    document.getElementById('appointment-modal').classList.add('hidden');
    currentId = null;
  }

  async function save() {
    const firstName = document.getElementById('appt-firstname').value.trim();
    const lastName  = document.getElementById('appt-lastname').value.trim();
    const date      = document.getElementById('appt-date').value;
    const time      = document.getElementById('appt-time').value;
    const price     = parseFloat(document.getElementById('appt-price').value);

    // Validation
    if (!firstName || !lastName) { UI.toast('Prénom et nom requis', 'error'); return; }
    if (!date || !time)          { UI.toast('Date et heure requises', 'error'); return; }

    const serviceChip = document.querySelector('.service-chip.active');
    if (!serviceChip) { UI.toast('Sélectionne un type de prestation', 'error'); return; }

    // Duration
    const durSel = document.getElementById('appt-duration').value;
    const duration = durSel === 'custom'
      ? parseInt(document.getElementById('appt-duration-custom').value) || 90
      : parseInt(durSel);

    const hasTips    = document.getElementById('appt-has-tips').checked;
    const tipsAmount = hasTips ? parseFloat(document.getElementById('appt-tips-amount').value) || 0 : 0;
    const instagram  = document.getElementById('appt-instagram').value.trim();

    const appt = {
      clientFirstName:  firstName,
      clientLastName:   lastName,
      clientInstagram:  instagram ? '@' + instagram.replace('@', '') : '',
      serviceType:      serviceChip.dataset.value,
      price:            isNaN(price) ? 0 : price,
      date,
      time,
      duration,
      depositPayment:   segments['deposit-payment'],
      status:           segments['appt-status'] || 'pending',
      servicePayment:   segments['service-payment'],
      hasTips,
      tipsAmount,
    };

    try {
      document.getElementById('save-appt-btn').textContent = '…';
      if (currentId) {
        await Store.update(currentId, appt);
        UI.toast('Rendez-vous modifié ✨', 'success');
      } else {
        await Store.add(appt);
        UI.toast('Rendez-vous ajouté 💅', 'success');
      }
      close();
    } catch (e) {
      UI.toast('Erreur lors de la sauvegarde', 'error');
      document.getElementById('save-appt-btn').textContent = 'Enregistrer';
    }
  }

  return { init, open, close };
})();

// ══════════════════════════════════════════════════
// CLIENTS PAGE
// ══════════════════════════════════════════════════
const ClientsPage = (() => {
  function render(filter = '') {
    const list = document.getElementById('clients-list');
    list.innerHTML = '';

    let clients = Store.getClients();
    if (filter) {
      const q = filter.toLowerCase();
      clients = clients.filter(c =>
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q)  ||
        c.instagram.toLowerCase().includes(q)
      );
    }

    document.getElementById('clients-count').textContent =
      `${clients.length} client${clients.length > 1 ? 's' : ''}`;

    if (clients.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">👥</div>
          <div class="empty-state-text">Aucune cliente trouvée</div>
          <div class="empty-state-sub">Les clientes apparaissent automatiquement après l'ajout d'un rendez-vous</div>
        </div>`;
      return;
    }

    clients.forEach(client => {
      const appts = client.appointments;
      const total = appts.reduce((s, a) => s + (a.price || 0) + (a.tipsAmount || 0), 0);
      const lastVisit = appts.map(a => a.date).sort().reverse()[0];

      // Most frequent service
      const svcCount = {};
      appts.forEach(a => { svcCount[a.serviceType] = (svcCount[a.serviceType] || 0) + 1; });
      const topSvc = Object.entries(svcCount).sort((a, b) => b[1] - a[1])[0];
      const svcInfo = topSvc ? CONFIG.serviceColors[topSvc[0]] : null;

      const card = document.createElement('div');
      card.className = 'client-card';
      card.innerHTML = `
        <div class="client-avatar">${client.firstName[0].toUpperCase()}${client.lastName[0].toUpperCase()}</div>
        <div class="client-info">
          <div class="client-name">${client.firstName} ${client.lastName}</div>
          <div class="client-insta">${client.instagram || '—'}</div>
          ${svcInfo ? `<span class="service-badge" style="background:${svcInfo.bg};color:${svcInfo.color}">${svcInfo.emoji} ${svcInfo.label}</span>` : ''}
        </div>
        <div class="client-meta">
          <div class="client-total">${UI.formatCurrency(total)}</div>
          <div class="client-rdv-count">${appts.length} RDV</div>
          <div class="client-rdv-count">${lastVisit ? 'Dernière : ' + UI.formatDate(lastVisit, {day:'numeric',month:'short'}) : ''}</div>
        </div>
      `;
      card.addEventListener('click', () => openClientModal(client));
      list.appendChild(card);
    });
  }

  function openClientModal(client) {
    const appts = client.appointments.sort((a, b) => b.date.localeCompare(a.date));
    const total = appts.reduce((s, a) => s + (a.price || 0) + (a.tipsAmount || 0), 0);

    document.getElementById('client-modal-name').textContent =
      `${client.firstName} ${client.lastName}`;

    const body = document.getElementById('client-modal-body');
    body.innerHTML = `
      <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">
        <div class="stat-card" style="flex:1;min-width:140px">
          <div class="stat-icon stat-icon-rose">💰</div>
          <div class="stat-info">
            <div class="stat-value">${UI.formatCurrency(total)}</div>
            <div class="stat-label">Total dépensé</div>
          </div>
        </div>
        <div class="stat-card" style="flex:1;min-width:140px">
          <div class="stat-icon stat-icon-gold">📅</div>
          <div class="stat-info">
            <div class="stat-value">${appts.length}</div>
            <div class="stat-label">Rendez-vous</div>
          </div>
        </div>
      </div>
      ${client.instagram ? `<p style="margin-bottom:16px;color:var(--text-secondary);font-size:14px">📸 <strong>${client.instagram}</strong></p>` : ''}
      <h4 style="margin-bottom:12px;font-family:'Outfit',sans-serif;font-size:16px">Historique</h4>
      <div class="appointments-list">
        ${appts.map(a => {
          const svc = CONFIG.serviceColors[a.serviceType] || { emoji: '💅', label: a.serviceType, color: '#B76E79', bg: '#F4D4D8' };
          const status = CONFIG.statusLabels[a.status] || CONFIG.statusLabels.pending;
          return `
            <div class="appt-list-item" style="border-color:${svc.color};cursor:pointer" onclick="AppointmentModal.open('${a.id}');document.getElementById('client-modal').classList.add('hidden')">
              <div class="appt-list-info">
                <div class="appt-list-name">${svc.emoji} ${svc.label}</div>
                <div class="appt-list-service">${UI.formatDate(a.date, {day:'numeric',month:'long',year:'numeric'})} à ${UI.formatTime(a.time)}</div>
                <div class="appt-list-date">
                  <span style="color:${status.color};font-weight:600;font-size:11px">${status.label}</span>
                  ${a.servicePayment ? ' · ' + CONFIG.paymentLabels[a.servicePayment] : ''}
                  ${a.hasTips ? ` · Tips: ${UI.formatCurrency(a.tipsAmount)}` : ''}
                </div>
              </div>
              <div class="appt-list-price">${UI.formatCurrency(a.price)}</div>
            </div>`;
        }).join('')}
      </div>
    `;

    document.getElementById('client-modal').classList.remove('hidden');
  }

  function init() {
    document.getElementById('client-modal-close').addEventListener('click', () => {
      document.getElementById('client-modal').classList.add('hidden');
    });
    document.getElementById('client-modal').addEventListener('click', e => {
      if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
    });
    document.getElementById('clients-search').addEventListener('input', e => {
      render(e.target.value);
    });
  }

  return { init, render };
})();

// ══════════════════════════════════════════════════
// STATS PAGE
// ══════════════════════════════════════════════════
const StatsPage = (() => {
  let year  = new Date().getFullYear();
  let month = new Date().getMonth();
  let filter = 'all';

  function init() {
    document.getElementById('stats-prev').addEventListener('click', () => {
      if (month === 0) { month = 11; year--; } else month--;
      render();
    });
    document.getElementById('stats-next').addEventListener('click', () => {
      if (month === 11) { month = 0; year++; } else month++;
      render();
    });

    // Filters
    document.getElementById('stats-filters').addEventListener('click', e => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      filter = btn.dataset.filter;
      document.querySelectorAll('#stats-filters .chip').forEach(c => c.classList.toggle('chip-active', c === btn));
      renderList();
    });

    document.getElementById('download-invoice-btn').addEventListener('click', () => {
      Invoice.generate(year, month);
    });

    initYearlyStats();
  }

  function render() {
    const label = UI.capitalize(UI.getMonthName(year, month));
    document.getElementById('stats-month-label').textContent = label;
    document.getElementById('invoice-month-label').textContent = label;

    const appts  = Store.getByMonth(year, month);
    const done   = appts.filter(a => a.status !== 'cancelled');
    let ca = 0;
    let tips = 0;
    let weroAmt = 0;

    done.forEach(a => {
      const price = a.price || 0;
      ca += price;
      const tipsAmt = a.tipsAmount || 0;
      tips += tipsAmt;

      const hasDeposit = a.depositPayment === 'wero' || a.depositPayment === 'especes';
      const depAmt = hasDeposit ? (CONFIG.business.defaultDeposit || 15) : 0;
      const restAmt = Math.max(0, price - depAmt);

      if (a.depositPayment === 'wero') weroAmt += depAmt;
      if (a.servicePayment === 'wero') weroAmt += (restAmt + tipsAmt);
    });

    const totalAmt = (ca + tips) || 1;
    const weroPct = Math.round((weroAmt / totalAmt) * 100);

    document.getElementById('stat-ca').textContent   = UI.formatCurrency(ca);
    document.getElementById('stat-rdv').textContent  = done.length;
    document.getElementById('stat-tips').textContent = UI.formatCurrency(tips);
    const especePct = 100 - weroPct;
    document.getElementById('stat-wero').textContent = `${especePct}% / ${weroPct}%`;
    document.getElementById('stats-bar-especes').style.width = `${especePct}%`;
    document.getElementById('stats-bar-wero').style.width = `${weroPct}%`;

    // Trend (vs prev month)
    const prevM = month === 0 ? 11 : month - 1;
    const prevY = month === 0 ? year - 1 : year;
    const prevAppts = Store.getByMonth(prevY, prevM).filter(a => a.status !== 'cancelled');
    const prevCa    = prevAppts.reduce((s, a) => s + (a.price || 0), 0);

    if (prevCa > 0) {
      const diff = ((ca - prevCa) / prevCa * 100).toFixed(0);
      const isUp = ca >= prevCa;
      document.getElementById('stat-ca-trend').innerHTML =
        `<span class="trend-${isUp ? 'up' : 'down'}">${isUp ? '↑' : '↓'} ${Math.abs(diff)}% vs mois précédent</span>`;
      document.getElementById('stat-rdv-trend').innerHTML =
        `<span class="trend-${done.length >= prevAppts.length ? 'up' : 'down'}">${done.length >= prevAppts.length ? '↑' : '↓'} vs ${prevAppts.length} RDV</span>`;
    } else {
      document.getElementById('stat-ca-trend').innerHTML = '';
      document.getElementById('stat-rdv-trend').innerHTML = '';
    }

    renderList();
  }

  function renderList() {
    const list  = document.getElementById('stats-appointments-list');
    let appts   = Store.getByMonth(year, month);

    if (filter === 'confirmed') appts = appts.filter(a => a.status !== 'cancelled');
    if (filter === 'cancelled') appts = appts.filter(a => a.status === 'cancelled');

    appts.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

    list.innerHTML = '';
    if (appts.length === 0) {
      list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">Aucune prestation ce mois</div></div>`;
      return;
    }

    appts.forEach(a => {
      const svc    = CONFIG.serviceColors[a.serviceType] || { emoji: '💅', label: a.serviceType, color: '#B76E79' };
      const status = CONFIG.statusLabels[a.status] || CONFIG.statusLabels.pending;
      const item = document.createElement('div');
      item.className = `appt-list-item${a.status === 'cancelled' ? ' cancelled' : ''}`;
      item.style.borderColor = svc.color;
      item.innerHTML = `
        <div class="appt-list-info">
          <div class="appt-list-name">${a.clientFirstName} ${a.clientLastName}</div>
          <div class="appt-list-service">${svc.emoji} ${svc.label} · ${UI.formatTime(a.time)}</div>
          <div class="appt-list-date">
            ${UI.formatDate(a.date, {day:'numeric',month:'short'})}
            · <span style="color:${status.color};font-weight:600;font-size:11px">${status.label}</span>
            ${a.servicePayment ? ' · ' + CONFIG.paymentLabels[a.servicePayment] : ''}
            ${a.hasTips ? ` · Tips +${UI.formatCurrency(a.tipsAmount)}` : ''}
          </div>
        </div>
        <div class="appt-list-price">${a.hasTips ? '✨ ' : ''}${UI.formatCurrency((a.price || 0) + (a.tipsAmount || 0))}</div>
      `;
      item.addEventListener('click', () => AppointmentModal.open(a.id));
      list.appendChild(item);
    });
  }

  return { init, render, getMonthYear: () => ({ year, month }) };
})();

// ══════════════════════════════════════════════════
// INVOICE — Génération PDF (livre de recettes)
// ══════════════════════════════════════════════════
const Invoice = (() => {
  const COLORS = {
    primary:    '#B76E79',
    dark:       '#2C1810',
    gold:       '#C9975A',
    lightGray:  '#F5F5F5',
    border:     '#E0D0C8',
    headerBg:   '#1A0F08',
    white:      '#FFFFFF',
    success:    '#2D9E5F',
    danger:     '#D94F4F',
  };

  function generate(year, month) {
    const appts = Store.getByMonth(year, month);
    const done  = appts.filter(a => a.status !== 'cancelled')
                       .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

    if (done.length === 0) {
      UI.toast('Aucune prestation ce mois à facturer', 'warning');
      return;
    }

    const monthName   = UI.capitalize(new Date(year, month, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));
    const issueDate   = new Date(year, month + 1, 0); // last day of month
    const issueDateFr = issueDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const counter     = Store.incrementInvoiceCounter();
    const invoiceNum  = `${year}-${String(month + 1).padStart(2, '0')}-${String(counter).padStart(3, '0')}`;

    let ca = 0;
    let wero = 0;

    done.forEach(a => {
      const price = a.price || 0;
      ca += price;

      const hasDeposit = a.depositPayment === 'wero' || a.depositPayment === 'especes';
      const depAmt = hasDeposit ? (CONFIG.business.defaultDeposit || 15) : 0;
      const restAmt = Math.max(0, price - depAmt);

      if (a.depositPayment === 'wero') wero += depAmt;
      // On n'inclut que le montant de la prestation dans le CA du PDF
      if (a.servicePayment === 'wero') wero += restAmt;
    });
    
    const total = ca;
    const cash  = total - wero;

    // Table rows
    const tableBody = [
      // Header row
      [
        { text: 'Date',      style: 'tableHeader' },
        { text: 'Heure',     style: 'tableHeader' },
        { text: 'Prénom',    style: 'tableHeader' },
        { text: 'Nom',       style: 'tableHeader' },
        { text: 'Prestation',style: 'tableHeader' },
        { text: 'Paiement',  style: 'tableHeader' },
        { text: 'Montant',   style: 'tableHeader' },
      ],
      ...done.map((a, i) => {
        const svc = CONFIG.serviceColors[a.serviceType];
        const date = new Date(a.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        const fillColor = i % 2 === 0 ? COLORS.white : COLORS.lightGray;
        return [
          { text: date,                          fillColor, fontSize: 9 },
          { text: a.time ? a.time.replace(':', 'h') : '', fillColor, fontSize: 9 },
          { text: a.clientFirstName || '',       fillColor, fontSize: 9 },
          { text: a.clientLastName  || '',       fillColor, fontSize: 9 },
          { text: svc ? svc.label : a.serviceType, fillColor, fontSize: 9 },
          { text: CONFIG.paymentLabels[a.servicePayment] || '—', fillColor, fontSize: 9 },
          { text: Number(a.price || 0).toFixed(2) + ' €', fillColor, fontSize: 9, alignment: 'right', bold: true },
        ];
      }),
    ];

    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [36, 36, 36, 60],

      footer: (currentPage, pageCount) => ({
        columns: [
          { text: `${CONFIG.business.name} — SIREN : ${CONFIG.business.siren}`, fontSize: 8, color: '#888', margin: [36, 0, 0, 0] },
          { text: `${CONFIG.business.vatNote}`, fontSize: 8, color: '#888', alignment: 'center' },
          { text: `Page ${currentPage}/${pageCount}`, fontSize: 8, color: '#888', alignment: 'right', margin: [0, 0, 36, 0] },
        ],
        margin: [0, 12],
      }),

      content: [

        // ── EN-TÊTE ─────────────────────────────────
        {
          columns: [
            {
              stack: [
                { text: CONFIG.business.name, style: 'businessName' },
                { text: CONFIG.business.ownerName, style: 'businessSub' },
                { text: CONFIG.business.legalStatus, style: 'businessSub' },
                { text: CONFIG.business.address, style: 'businessSub' },
                { text: CONFIG.business.zipCity, style: 'businessSub' },
              ]
            },
            {
              stack: [
                { text: 'LIVRE DES RECETTES', style: 'invoiceTitle' },
                { text: `N° ${invoiceNum}`, style: 'invoiceNum' },
                { text: `Période : ${monthName}`, style: 'invoiceMeta' },
                { text: `Date d'émission : ${issueDateFr}`, style: 'invoiceMeta' },
                { text: `SIREN : ${CONFIG.business.siren}`, style: 'invoiceMeta' },
              ],
              alignment: 'right',
            },
          ],
          margin: [0, 0, 0, 24],
        },

        // ── LIGNE SÉPARATRICE ────────────────────────
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 523, y2: 0, lineWidth: 2, lineColor: COLORS.primary }], margin: [0, 0, 0, 20] },

        // ── TITRE TABLEAU ───────────────────────────
        { text: `Détail des prestations — ${monthName}`, style: 'sectionTitle', margin: [0, 0, 0, 12] },

        // ── TABLEAU DES PRESTATIONS ──────────────────
        {
          table: {
            headerRows: 1,
            widths: [40, 35, 70, 70, 95, 55, 50],
            body: tableBody,
          },
          layout: {
            hLineWidth: (i, node) => i === 0 || i === 1 || i === node.table.body.length ? 1.5 : 0.5,
            vLineWidth: () => 0.5,
            hLineColor: (i) => i === 0 || i === 1 ? COLORS.primary : COLORS.border,
            vLineColor: () => COLORS.border,
            paddingTop:    () => 6,
            paddingBottom: () => 6,
            paddingLeft:   () => 6,
            paddingRight:  () => 6,
          },
          margin: [0, 0, 0, 24],
        },

        // ── RÉCAPITULATIF ────────────────────────────
        { text: 'Récapitulatif du mois', style: 'sectionTitle', margin: [0, 0, 0, 12] },

        {
          columns: [
            {
              // Left: Summary table
              table: {
                widths: [180, 90],
                body: [
                  [
                    { text: 'Total des prestations HT', style: 'summaryLabel' },
                    { text: ca.toFixed(2) + ' €', style: 'summaryValue' },
                  ],
                  [
                    { text: 'Paiements Wero', style: 'summaryLabel' },
                    { text: wero.toFixed(2) + ' €', style: 'summaryLabel' },
                  ],
                  [
                    { text: 'Paiements Espèces', style: 'summaryLabel' },
                    { text: cash.toFixed(2) + ' €', style: 'summaryLabel' },
                  ],
                  [
                    { text: 'Nombre de prestations', style: 'summaryLabel' },
                    { text: done.length.toString(), style: 'summaryLabel' },
                  ],
                  [
                    { text: 'TOTAL RECETTES (TTC)', bold: true, fontSize: 11, color: COLORS.dark, fillColor: COLORS.lightGray },
                    { text: total.toFixed(2) + ' €', bold: true, fontSize: 11, color: COLORS.primary, fillColor: COLORS.lightGray, alignment: 'right' },
                  ],
                ],
              },
              layout: {
                hLineWidth: () => 0.5,
                vLineWidth: () => 0.5,
                hLineColor: () => COLORS.border,
                vLineColor: () => COLORS.border,
                paddingTop:    () => 7,
                paddingBottom: () => 7,
                paddingLeft:   () => 10,
                paddingRight:  () => 10,
              },
            },
            { width: '*', text: '' }, // Spacer
          ],
        },

        // ── MENTIONS LÉGALES ─────────────────────────
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 523, y2: 0, lineWidth: 1, lineColor: COLORS.border }], margin: [0, 28, 0, 16] },

        {
          stack: [
            { text: 'Mentions légales', bold: true, fontSize: 9, color: COLORS.dark, margin: [0, 0, 0, 6] },
            { text: CONFIG.business.vatNote, fontSize: 8.5, color: '#666', margin: [0, 0, 0, 3] },
            { text: `Pénalités de retard : ${CONFIG.defaults.lateRate}.`, fontSize: 8.5, color: '#666', margin: [0, 0, 0, 3] },
            { text: 'Indemnité forfaitaire de recouvrement pour les professionnels : 40 €.', fontSize: 8.5, color: '#666', margin: [0, 0, 0, 3] },
            { text: 'Ce document tient lieu de livre des recettes conformément à l\'article 50-0 du CGI.', fontSize: 8.5, color: '#666', italics: true },
          ],
        },
      ],

      styles: {
        businessName: {
          fontSize: 18, bold: true,
          color: COLORS.dark, margin: [0, 0, 0, 4],
        },
        businessSub: {
          fontSize: 9, color: '#555', margin: [0, 1, 0, 1],
        },
        invoiceTitle: {
          fontSize: 18, bold: true, color: COLORS.primary,
          margin: [0, 0, 0, 4],
        },
        invoiceNum: {
          fontSize: 13, bold: true, color: COLORS.dark, margin: [0, 0, 0, 4],
        },
        invoiceMeta: {
          fontSize: 9, color: '#555', margin: [0, 2, 0, 2],
        },
        sectionTitle: {
          fontSize: 12, bold: true, color: COLORS.dark,
        },
        tableHeader: {
          bold: true, fontSize: 9, color: COLORS.white,
          fillColor: COLORS.dark, alignment: 'left',
        },
        summaryLabel: {
          fontSize: 10, color: COLORS.dark,
        },
        summaryValue: {
          fontSize: 10, bold: true, color: COLORS.primary, alignment: 'right',
        },
      },

      defaultStyle: {
        fontSize: 10,
        color: COLORS.dark,
        lineHeight: 1.3,
      },
    };

    try {
      const filename = `NailsByLV_Recettes_${year}-${String(month + 1).padStart(2, '0')}.pdf`;
      // Toujours utiliser open() car download() peut être bloqué par les navigateurs
      pdfMake.createPdf(docDefinition).open();
      UI.toast('Facture ouverte dans un nouvel onglet 📄', 'success');
    } catch (e) {
      console.error('PDF error:', e);
      UI.toast('Erreur lors de la génération du PDF', 'error');
    }
  }

  return { generate };
})();

// ══════════════════════════════════════════════════
// ROUTER — Navigation SPA
// ══════════════════════════════════════════════════
const Router = (() => {
  let currentPage = 'planning';

  function navigateTo(page) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    // Show target
    const target = document.getElementById(`page-${page}`);
    if (target) target.classList.add('active');

    // Update nav items (desktop)
    document.querySelectorAll('.nav-item').forEach(n =>
      n.classList.toggle('active', n.dataset.page === page));

    // Update bottom nav (mobile)
    document.querySelectorAll('.bottom-nav-item').forEach(n =>
      n.classList.toggle('active', n.dataset.page === page));

    currentPage = page;

    // Trigger page renders
    if (page === 'clients') ClientsPage.render();
    if (page === 'stats')   StatsPage.render();
  }

  function init() {
    // Desktop nav
    document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
      btn.addEventListener('click', () => navigateTo(btn.dataset.page));
    });
    // Mobile nav
    document.querySelectorAll('.bottom-nav-item[data-page]').forEach(btn => {
      btn.addEventListener('click', () => navigateTo(btn.dataset.page));
    });
  }

  return { init, navigateTo, getCurrent: () => currentPage };
})();

// ══════════════════════════════════════════════════
// SETTINGS PAGE
// ══════════════════════════════════════════════════
const SettingsPage = (() => {
  function init() {
    // Export
    document.getElementById('export-data-btn').addEventListener('click', () => {
      const data   = Store.export();
      const blob   = new Blob([data], { type: 'application/json' });
      const url    = URL.createObjectURL(blob);
      const a      = document.createElement('a');
      const d = new Date();
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      a.href       = url;
      a.download   = `nailbook_backup_${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
      UI.toast('Données exportées', 'success');
    });

    // Import
    document.getElementById('import-data-btn').addEventListener('click', () => {
      document.getElementById('import-file-input').click();
    });
    document.getElementById('import-file-input').addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file) return;
      const ok = await UI.confirm('📥', 'Importer des données ?',
        'Attention : cela remplacera toutes les données actuelles.', 'Importer', 'btn-primary');
      if (!ok) return;
      const text = await file.text();
      const success = Store.import(text);
      if (success) UI.toast('Données importées', 'success');
      else UI.toast('Format de fichier invalide', 'error');
      e.target.value = '';
    });

    // Edit settings
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
      document.getElementById('edit-business-btn').addEventListener('click', () => {
        document.getElementById('set-input-name').value = CONFIG.business.name || '';
        document.getElementById('set-input-owner').value = CONFIG.business.ownerName || '';
        document.getElementById('set-input-siren').value = CONFIG.business.siren || '';
        document.getElementById('set-input-address').value = CONFIG.business.address || '';
        document.getElementById('set-input-duration').value = CONFIG.business.defaultDuration || 90;
        document.getElementById('set-input-deposit').value = CONFIG.business.defaultDeposit || 15;
        settingsModal.classList.remove('hidden');
      });

      const closeSettings = () => settingsModal.classList.add('hidden');
      document.getElementById('settings-modal-close').addEventListener('click', closeSettings);
      document.getElementById('settings-modal-cancel').addEventListener('click', closeSettings);

      document.getElementById('settings-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('set-input-name').value;
        const owner = document.getElementById('set-input-owner').value;
        const siren = document.getElementById('set-input-siren').value;
        const address = document.getElementById('set-input-address').value;
        const duration = parseInt(document.getElementById('set-input-duration').value, 10);
        const deposit = parseFloat(document.getElementById('set-input-deposit').value);

        CONFIG.business.name = name;
        CONFIG.business.ownerName = owner;
        CONFIG.business.siren = siren;
        CONFIG.business.address = address;
        CONFIG.business.defaultDuration = duration;
        CONFIG.business.defaultDeposit = deposit;

        localStorage.setItem('nailbook_biz_settings', JSON.stringify({
          name, ownerName: owner, siren, address, defaultDuration: duration, defaultDeposit: deposit
        }));

        if(document.getElementById('set-val-name')) document.getElementById('set-val-name').textContent = name;
        if(document.getElementById('set-val-owner')) document.getElementById('set-val-owner').textContent = owner;
        if(document.getElementById('set-val-siren')) document.getElementById('set-val-siren').textContent = siren;
        if(document.getElementById('set-val-address')) document.getElementById('set-val-address').textContent = address;
        if(document.getElementById('set-val-duration')) document.getElementById('set-val-duration').textContent = duration >= 60 ? Math.floor(duration/60) + 'h' + (duration%60||'00') : duration + ' min';
        if(document.getElementById('set-val-deposit')) document.getElementById('set-val-deposit').textContent = deposit + ' €';
        
        closeSettings();
        UI.toast('Paramètres enregistrés', 'success');
      });
    }

    // Change password
    document.getElementById('change-password-form').addEventListener('submit', async e => {
      e.preventDefault();
      const current  = document.getElementById('current-password').value;
      const newPwd   = document.getElementById('new-password').value;
      const confirm2 = document.getElementById('confirm-password').value;
      const msg      = document.getElementById('password-change-msg');

      if (newPwd !== confirm2) {
        msg.textContent = '❌ Les mots de passe ne correspondent pas';
        msg.style.color = 'var(--danger)';
        msg.classList.remove('hidden');
        return;
      }
      if (newPwd.length < 6) {
        msg.textContent = '❌ Mot de passe trop court (min. 6 caractères)';
        msg.style.color = 'var(--danger)';
        msg.classList.remove('hidden');
        return;
      }

      if (CONFIG.firebase.apiKey !== 'FIREBASE_API_KEY') {
        msg.textContent = '❌ En mode Firebase, modifie ton mot de passe depuis la Console Firebase.';
        msg.style.color = 'var(--danger)';
        msg.classList.remove('hidden');
        return;
      }
      const ok = await Auth.changePassword(current, newPwd);
      if (ok) {
        msg.textContent = '✅ Mot de passe modifié avec succès';
        msg.style.color = 'var(--success)';
        msg.classList.remove('hidden');
        e.target.reset();
        setTimeout(() => msg.classList.add('hidden'), 3000);
      } else {
        msg.textContent = '❌ Mot de passe actuel incorrect';
        msg.style.color = 'var(--danger)';
        msg.classList.remove('hidden');
      }
    });
  }

  return { init };
})();

// ══════════════════════════════════════════════════
// MAIN INIT
// ══════════════════════════════════════════════════
async function initApp() {
  // ── Auth screen ──
  Auth.onAuthStateReady(async (isAuthenticated) => {
    if (!isAuthenticated) {
      document.getElementById('auth-screen').classList.remove('hidden');
      document.getElementById('app').classList.add('hidden');
    } else {
      document.getElementById('auth-screen').classList.add('hidden');
      await showApp();
    }
  });

  // Password toggle
  document.getElementById('toggle-password').addEventListener('click', () => {
    const input = document.getElementById('password-input');
    input.type = input.type === 'password' ? 'text' : 'password';
  });

  // Auth form submit
  document.getElementById('auth-form').addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('[type=submit]');
    
    const lockTime = Auth.checkLock();
    if (lockTime > 0) {
      const err = document.getElementById('auth-error');
      err.textContent = `🔒 Sécurité : Trop de tentatives. Réessayez dans ${lockTime}s.`;
      err.classList.remove('hidden');
      return;
    }

    submitBtn.textContent = '...';
    submitBtn.disabled = true;
    const pwd = document.getElementById('password-input').value;
    const res = await Auth.verify(pwd);
    submitBtn.textContent = 'Accéder';
    submitBtn.disabled = false;
    
    if (res.locked) {
      const err = document.getElementById('auth-error');
      err.textContent = `🔒 Compte verrouillé pour sécurité.`;
      err.classList.remove('hidden');
      return;
    }

    if (res.ok) {
      Auth.login();
      const screen = document.getElementById('auth-screen');
      screen.style.transition = 'opacity .3s ease';
      screen.style.opacity = '0';
      setTimeout(async () => {
        screen.classList.add('hidden');
        screen.style.opacity = '';
        screen.style.transition = '';
        await showApp();
      }, 300);
    } else {
      document.getElementById('auth-error').classList.remove('hidden');
      document.getElementById('password-input').value = '';
      document.getElementById('password-input').focus();
    }
  });

  // Logout buttons
  async function doLogout() {
    await Auth.logout();
    appInitialized = false; // reset so showApp can run again next login
    document.getElementById('app').classList.add('hidden');
    const screen = document.getElementById('auth-screen');
    screen.classList.remove('hidden');
    document.getElementById('password-input').value = '';
    document.getElementById('auth-error').classList.add('hidden');
  }
  document.getElementById('logout-btn-desk').addEventListener('click', doLogout);
  document.getElementById('logout-btn-settings').addEventListener('click', doLogout);

  // FAB
  document.getElementById('fab-btn').addEventListener('click', () => {
    const cal = Calendar.getCurrentDate();
    AppointmentModal.open(null, cal.dayViewDate);
  });
}

let appInitialized = false;

async function showApp() {
  if (appInitialized) return; // prevent double-init
  appInitialized = true;

  document.getElementById('app').classList.remove('hidden');

  // Init store
  await Store.init();

  // Init modules
  Router.init();
  Calendar.init();
  AppointmentModal.init();
  ClientsPage.init();
  StatsPage.init();
  SettingsPage.init();

  // Subscribe to data changes → refresh all views
  Store.subscribe(() => {
    Calendar.refresh();
    const currentPage = Router.getCurrent();
    if (currentPage === 'clients') ClientsPage.render();
    if (currentPage === 'stats')   StatsPage.render();
  });

  // Initial renders
  Calendar.render();
  Router.navigateTo('planning');

  // Expose AppointmentModal globally (used in onclick in client modal)
  window.AppointmentModal = AppointmentModal;

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  // End-of-month invoice reminder
  checkMonthEndReminder();
}

function checkMonthEndReminder() {
  const now   = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  if (now.getDate() === lastDay || now.getDate() === lastDay - 1) {
    const key = `nailbook_reminded_${now.getFullYear()}_${now.getMonth()}`;
    if (!localStorage.getItem(key)) {
      setTimeout(() => {
        UI.toast('📄 Fin du mois — N\'oublie pas de télécharger ta facture !', 'warning', 6000);
        localStorage.setItem(key, '1');
      }, 2000);
    }
  }
}

// ─── YEARLY STATS ──────────────────────────────────────────
let currentYearlyYear = new Date().getFullYear();

function initYearlyStats() {
  document.getElementById('btn-yearly-stats').addEventListener('click', () => {
    // On open, reset to current year
    currentYearlyYear = new Date().getFullYear();
    renderYearlyStats();
    document.getElementById('yearly-stats-modal').classList.remove('hidden');
  });
  
  document.getElementById('close-yearly-stats-btn').addEventListener('click', () => {
    document.getElementById('yearly-stats-modal').classList.add('hidden');
  });

  document.getElementById('yearly-prev').addEventListener('click', () => {
    currentYearlyYear--;
    renderYearlyStats();
  });

  document.getElementById('yearly-next').addEventListener('click', () => {
    currentYearlyYear++;
    renderYearlyStats();
  });
}

function renderYearlyStats() {
  document.getElementById('yearly-label').textContent = currentYearlyYear;
  
  const allAppts = Store.getAll();
  let totalCA = 0;
  let totalRDV = 0;
  
  const monthlyCA = Array(12).fill(0);
  const monthlyRDV = Array(12).fill(0);
  
  allAppts.forEach(a => {
    if (!a.date || !a.date.startsWith(currentYearlyYear.toString()) || a.status === 'cancelled') return;
    const m = parseInt(a.date.split('-')[1], 10) - 1;
    if (m >= 0 && m <= 11) {
      const ca = (a.price || 0) + (a.tipsAmount || 0);
      monthlyCA[m] += ca;
      monthlyRDV[m]++;
      totalCA += ca;
      totalRDV++;
    }
  });

  document.getElementById('yearly-total-ca').textContent = UI.formatCurrency(totalCA);
  document.getElementById('yearly-total-rdv').textContent = totalRDV;

  const chart = document.getElementById('yearly-chart');
  const labels = document.getElementById('yearly-chart-labels');
  chart.innerHTML = '';
  labels.innerHTML = '';

  const maxCA = Math.max(...monthlyCA, 1);
  const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

  for (let i = 0; i < 12; i++) {
    const heightPercent = (monthlyCA[i] / maxCA) * 100;
    
    const barWrapper = document.createElement('div');
    barWrapper.style.flex = '1';
    barWrapper.style.display = 'flex';
    barWrapper.style.flexDirection = 'column';
    barWrapper.style.justifyContent = 'flex-end';
    barWrapper.style.alignItems = 'center';
    barWrapper.style.height = '100%';
    
    const bar = document.createElement('div');
    bar.style.width = '70%';
    bar.style.height = `${Math.max(heightPercent, 2)}%`; // 2% minimum height for empty months
    bar.style.background = monthlyCA[i] > 0 ? 'var(--accent)' : 'var(--border-light)';
    bar.style.borderRadius = '4px 4px 0 0';
    bar.style.transition = 'height 0.3s ease';
    
    if (monthlyCA[i] > 0) {
      bar.title = `${monthNames[i]}: ${UI.formatCurrency(monthlyCA[i])} (${monthlyRDV[i]} RDV)`;
    }

    barWrapper.appendChild(bar);
    chart.appendChild(barWrapper);

    const label = document.createElement('div');
    label.style.flex = '1';
    label.style.textAlign = 'center';
    label.textContent = monthNames[i];
    labels.appendChild(label);
  }
}

// ─── LAUNCH ───────────────────────────────────────────────
// All definitions are ready — safe to call initApp now
initApp();
