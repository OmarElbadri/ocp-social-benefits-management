// ══════════════════════════════════════
// INIT — reload depuis localStorage si déjà connecté
// ══════════════════════════════════════
window.onload = async () => {
  const token = localStorage.getItem("token");
  if (!token) return;

  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("appShell").style.display    = "block";

  const nom  = localStorage.getItem("user_nom")  || "Utilisateur";
  const role = localStorage.getItem("user_role") || "agent";
  document.body.setAttribute("data-role", role);

  const roleLabel = role === "admin" ? "Administrateur" : "Agent Social";
  const initiale  = nom.charAt(0).toUpperCase();

  // Sidebar bottom
  const sbAv   = document.getElementById("sbUserAv");
  const sbName = document.getElementById("sbUserName");
  const sbRole = document.getElementById("sbUserRole");
  if (sbAv)   sbAv.textContent   = initiale;
  if (sbName) sbName.textContent = nom;
  if (sbRole) sbRole.textContent = roleLabel;

  // Topbar user pill
  const tbName = document.getElementById("topbarName");
  const tbRole = document.getElementById("topbarRole");
  const tbAv   = document.getElementById("topbarAv");
  if (tbName) tbName.textContent = nom;
  if (tbRole) tbRole.textContent = roleLabel;
  if (tbAv)   tbAv.textContent   = initiale;

  try {
    await Promise.all([
      window.loadEmployes(),
      window.loadConjoints(),
      window.loadEnfants(),
      window.loadExcursions(),
      window.loadCamps(),
      window.loadUsers(),
      window.loadEncadrants()
    ]);
    window.loadDashboard();
    updateApiStatus(true);
  } catch (e) {
    console.error("Erreur chargement :", e);
    updateApiStatus(false);
  }
};

// ══════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════
window.loadDashboard = function () {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
  set("dash-employes",   document.getElementById("employesTable")?.rows.length      ?? 0);
  set("dash-conjoints",  document.getElementById("conjointsTable")?.rows.length     ?? 0);
  set("dash-enfants",    document.getElementById("enfantsTable")?.rows.length       ?? 0);
  set("dash-excursions", document.getElementById("excursionsGrid")?.children.length ?? 0);
  set("dash-camps",      document.getElementById("campsGrid")?.children.length      ?? 0);
  set("dash-encadrants", document.getElementById("encadrantsGrid")?.children.length ?? 0);

  // Welcome name
  const nameEl = document.getElementById("dash-user-name");
  if (nameEl) nameEl.textContent = localStorage.getItem("user_nom") || "Administrateur";

  // Date
  const dateEl = document.getElementById("dash-date");
  if (dateEl) {
    const now = new Date();
    const opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    dateEl.innerHTML = `<div style="font-size:11px;opacity:.7;margin-bottom:2px">Aujourd'hui</div>${now.toLocaleDateString('fr-MA', opts)}`;
  }
};

// ══════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════
const _sectionTitles = {
  dashboard:    "Vue d'ensemble",
  employes:     "Employés",
  conjoints:    "Conjoints",
  enfants:      "Enfants",
  excursions:   "Excursions",
  camps:        "Camps d'Été",
  encadrants:   "Encadrants",
  utilisateurs: "Utilisateurs"
};

const _sectionIcons = {
  dashboard:    "fa-chart-pie",
  employes:     "fa-id-badge",
  conjoints:    "fa-people-arrows",
  enfants:      "fa-child",
  excursions:   "fa-bus",
  camps:        "fa-campground",
  encadrants:   "fa-person-chalkboard",
  utilisateurs: "fa-user-shield"
};

const _sectionIconColors = {
  dashboard:    "linear-gradient(135deg,#1a7a4a,#22a862)",
  employes:     "linear-gradient(135deg,#1a7a4a,#22a862)",
  conjoints:    "linear-gradient(135deg,#9d174d,#ec4899)",
  enfants:      "linear-gradient(135deg,#92400e,#f59e0b)",
  excursions:   "linear-gradient(135deg,#1e3a8a,#3b82f6)",
  camps:        "linear-gradient(135deg,#134e4a,#14b8a6)",
  encadrants:   "linear-gradient(135deg,#1e293b,#64748b)",
  utilisateurs: "linear-gradient(135deg,#4c1d95,#8b5cf6)"
};

const _sectionLoaders = {
  employes:     () => window.loadEmployes?.(),
  conjoints:    () => window.loadConjoints?.(),
  enfants:      () => window.loadEnfants?.(),
  excursions:   () => window.loadExcursions?.(),
  camps:        () => window.loadCamps?.(),
  encadrants:   () => window.loadEncadrants?.(),
  utilisateurs: () => window.loadUsers?.(),
  dashboard:    () => window.loadDashboard?.()
};

window.showSection = function (section, linkEl) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));

  const el = document.getElementById(`sec-${section}`);
  if (el) el.classList.add("active");
  if (linkEl) linkEl.classList.add("active");

  const title = document.getElementById("topbarTitle");
  if (title) title.textContent = _sectionTitles[section] || section;

  const icon = document.getElementById("topbarIcon");
  if (icon) {
    icon.innerHTML = `<i class="fas ${_sectionIcons[section] || 'fa-circle'}"></i>`;
    icon.style.background = _sectionIconColors[section] || "linear-gradient(135deg,var(--g500),var(--g700))";
  }

  // always reload fresh data when switching sections
  const loader = _sectionLoaders[section];
  if (loader) loader();
};

// ══════════════════════════════════════
// MODALS
// ══════════════════════════════════════
window.openModal = function (id) {
  const el = document.getElementById(`modal-${id}`);
  if (el) el.style.display = "flex";
};

window.closeModal = function (id) {
  const el = document.getElementById(`modal-${id}`);
  if (el) el.style.display = "none";
};

// Fermer modal en cliquant sur l'overlay
document.addEventListener("click", e => {
  if (e.target.classList.contains("modal-overlay")) {
    e.target.style.display = "none";
  }
});

// ══════════════════════════════════════
// TOAST
// ══════════════════════════════════════
window.showToast = function (msg, isError) {
  const t = document.getElementById("toast");
  if (!t) return;
  document.getElementById("toastMsg").textContent = msg;
  t.classList.toggle("toast-error", !!isError);
  t.style.display = "flex";
  if (t._toastTimer) clearTimeout(t._toastTimer);
  t._toastTimer = setTimeout(() => t.style.display = "none", isError ? 6000 : 3000);
};

// ══════════════════════════════════════
// HELPERS
// ══════════════════════════════════════
window.isAdmin = () => localStorage.getItem("user_role") === "admin";
window.isAgent = () => localStorage.getItem("user_role") === "agent";

window.doLogout = function () {
  ["token", "user_nom", "user_role", "user_id"].forEach(k => localStorage.removeItem(k));
  document.getElementById("appShell").style.display    = "none";
  document.getElementById("loginScreen").style.display = "flex";
};

window.updateApiStatus = function (online) {
  const dot = document.getElementById("apiDot");
  const txt = document.getElementById("apiStatusTxt");
  if (!dot || !txt) return;
  dot.className   = "api-dot" + (online ? " connected" : "");
  txt.textContent = online ? "API connectée" : "API déconnectée";
};

window.confirmDel = function (label, callback) {
  document.getElementById("delMsg").textContent = `Supprimer ${label} ?`;
  const btn = document.getElementById("delConfirmBtn");
  btn.onclick = () => { closeModal("confirmDel"); callback(); };
  openModal("confirmDel");
};

window.filterSection = function (tableId, query) {
  const q = query.toLowerCase();
  document.querySelectorAll(`#${tableId} tr`).forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? "" : "none";
  });
};

window.filterGrid = function (gridId, query) {
  const q = query.toLowerCase();
  document.querySelectorAll(`#${gridId} > *`).forEach(card => {
    card.style.display = card.textContent.toLowerCase().includes(q) ? "" : "none";
  });
};

// ══════════════════════════════════════
// GLOBAL SEARCH
// ══════════════════════════════════════
let _srElements = [];
let _srActiveIdx = -1;

const _srSections = [
  { id: 'employes',     label: 'Employés',      icon: 'fa-id-badge',           selector: '#employesTable tr',        filterTbl: 'employesTable',  filterInp: '#sec-employes .filter-input-wrap input' },
  { id: 'conjoints',   label: 'Conjoints',      icon: 'fa-people-arrows',      selector: '#conjointsTable tr',       filterTbl: 'conjointsTable', filterInp: '#sec-conjoints .filter-input-wrap input' },
  { id: 'enfants',     label: 'Enfants',         icon: 'fa-child',              selector: '#enfantsTable tr',         filterTbl: 'enfantsTable',   filterInp: '#sec-enfants .filter-input-wrap input' },
  { id: 'excursions',  label: 'Excursions',      icon: 'fa-bus',                selector: '#excursionsGrid .exc-card',  filterGrid: 'excursionsGrid',  filterInp: '#sec-excursions .filter-input-wrap input' },
  { id: 'camps',       label: "Camps d'Été",     icon: 'fa-campground',         selector: '#campsGrid .camp-card',      filterGrid: 'campsGrid',       filterInp: '#sec-camps .filter-input-wrap input' },
  { id: 'encadrants',  label: 'Encadrants',      icon: 'fa-chalkboard-teacher', selector: '#encadrantsGrid .enc-card',  filterGrid: 'encadrantsGrid',  filterInp: '#sec-encadrants .filter-input-wrap input' },
  { id: 'utilisateurs',label: 'Utilisateurs',    icon: 'fa-users-gear',         selector: '#usersContainer > div',      filterGrid: 'usersContainer',  filterInp: '#sec-utilisateurs .filter-input-wrap input' },
];

function _escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function _escHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function _hilit(text, q) {
  return _escHtml(text).replace(new RegExp(_escRe(_escHtml(q)), 'gi'), m => `<mark>${m}</mark>`);
}

window.searchAll = function (query) {
  const q = query.trim().toLowerCase();
  const dropdown = document.getElementById('searchDropdown');
  const clearBtn = document.getElementById('searchClearBtn');
  if (clearBtn) clearBtn.style.display = q ? 'flex' : 'none';
  if (!q) { dropdown.style.display = 'none'; _srElements = []; _srActiveIdx = -1; return; }

  _srElements = [];
  _srActiveIdx = -1;
  let html = '';
  let total = 0;

  _srSections.forEach(sec => {
    const matches = [...document.querySelectorAll(sec.selector)].filter(el =>
      el.textContent.toLowerCase().includes(q)
    );
    if (!matches.length) return;
    total += matches.length;

    html += `<div class="sd-group">
      <div class="sd-group-header"><i class="fas ${sec.icon}"></i>${sec.label}<span class="sd-count">${matches.length}</span></div>`;

    matches.slice(0, 5).forEach(el => {
      const raw = el.textContent.trim().replace(/\s+/g, ' ');
      const short = raw.length > 72 ? raw.substring(0, 72) + '…' : raw;
      const idx = _srElements.length;
      _srElements.push({ secId: sec.id, el });
      html += `<div class="sd-result" data-idx="${idx}" onclick="searchSelect(${idx})">${_hilit(short, q)}</div>`;
    });
    if (matches.length > 5) {
      html += `<div class="sd-more" onclick="searchGoSection('${sec.id}','${q.replace(/'/g,"\\'")}')">`
            + `<i class="fas fa-arrow-right" style="font-size:10px"></i> ${matches.length - 5} autres résultats dans ${sec.label}</div>`;
    }
    html += '</div>';
  });

  if (!total) {
    html = `<div class="sd-empty"><i class="fas fa-magnifying-glass"></i> Aucun résultat pour « ${_escHtml(query)} »</div>`;
  }

  dropdown.innerHTML = html;
  dropdown.style.display = 'block';
};

window.searchKeyNav = function (e) {
  const dd = document.getElementById('searchDropdown');
  if (!dd || dd.style.display === 'none') return;
  const items = [...dd.querySelectorAll('.sd-result')];
  if (!items.length) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    _srActiveIdx = Math.min(_srActiveIdx + 1, items.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    _srActiveIdx = Math.max(_srActiveIdx - 1, 0);
  } else if (e.key === 'Enter' && _srActiveIdx >= 0) {
    e.preventDefault(); searchSelect(_srActiveIdx); return;
  } else if (e.key === 'Escape') {
    clearSearch(); return;
  } else { return; }
  items.forEach((el, i) => el.classList.toggle('sd-active', i === _srActiveIdx));
  items[_srActiveIdx]?.scrollIntoView({ block: 'nearest' });
};

window.searchSelect = function (idx) {
  const res = _srElements[idx];
  if (!res) return;
  const q = document.getElementById('globalSearchInput')?.value?.trim() || '';
  clearSearch();
  const navLink = document.querySelector(`.nav-link[onclick*="'${res.secId}'"]`);
  showSection(res.secId, navLink);
  // Section reloads data from API — wait then re-find element by text match
  setTimeout(() => _searchHighlightInSection(res.secId, q), 480);
};

window.searchGoSection = function (secId, query) {
  clearSearch();
  const navLink = document.querySelector(`.nav-link[onclick*="'${secId}'"]`);
  showSection(secId, navLink);
  setTimeout(() => _searchHighlightInSection(secId, query), 480);
};

function _searchHighlightInSection(secId, q) {
  if (!q) return;
  const ql = q.toLowerCase();
  const sec = _srSections.find(s => s.id === secId);
  if (!sec) return;

  // For table sections: apply local filter + scroll to first visible row
  if (sec.filterTbl) {
    filterSection(sec.filterTbl, q);
    const inp = document.querySelector(sec.filterInp);
    if (inp) inp.value = q;
    const firstRow = document.querySelector(`#${sec.filterTbl} tr:not([style*="display: none"]):not([style*="display:none"])`);
    if (firstRow) {
      firstRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstRow.classList.add('search-highlight');
      setTimeout(() => firstRow.classList.remove('search-highlight'), 2000);
    }
    return;
  }

  // For card/grid sections: apply grid filter + scroll to first visible card
  if (sec.filterGrid) {
    filterGrid(sec.filterGrid, q);
    const inp = document.querySelector(sec.filterInp);
    if (inp) inp.value = q;
    const firstCard = [...document.querySelectorAll(`#${sec.filterGrid} > *`)]
      .find(el => el.style.display !== 'none' && el.textContent.toLowerCase().includes(ql));
    if (firstCard) {
      firstCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstCard.classList.add('search-highlight');
      setTimeout(() => firstCard.classList.remove('search-highlight'), 2000);
    }
  }
}

window.clearSearch = function () {
  const inp = document.getElementById('globalSearchInput');
  if (inp) inp.value = '';
  const dd = document.getElementById('searchDropdown');
  if (dd) dd.style.display = 'none';
  const btn = document.getElementById('searchClearBtn');
  if (btn) btn.style.display = 'none';
  _srElements = []; _srActiveIdx = -1;
};

// Close dropdown on outside click
document.addEventListener('click', e => {
  if (!e.target.closest('.search-container')) {
    const dd = document.getElementById('searchDropdown');
    if (dd) dd.style.display = 'none';
  }
});

// Bouton "+ Ajouter" topbar : ouvre le bon modal selon la section active
window.contextAdd = function () {
  const active = document.querySelector(".section.active");
  if (!active) return;
  const map = {
    "sec-employes":     () => openModal("addEmploye"),
    "sec-conjoints":    () => openAddConjoint(),
    "sec-enfants":      () => openModal("addEnfant"),
    "sec-excursions":   () => openAddExcursion(),
    "sec-camps":        () => openAddCamp(),
    "sec-encadrants":   () => openAddEncadrant(),
    "sec-utilisateurs": () => openModal("addUser")
  };
  const fn = map[active.id];
  if (fn) fn();
};
