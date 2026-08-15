window.loadExcursions = async function () {
  const data = await apiFetch("/excursions");
  const list = data.results || data;

  const badge = document.getElementById("nb-exc");
  if (badge) badge.textContent = list.length;
  const count = document.getElementById("excursions-count");
  if (count) count.textContent = `${list.length} excursion${list.length !== 1 ? 's' : ''} enregistrée${list.length !== 1 ? 's' : ''}`;

  const addBtn = document.getElementById("btn-add-excursion");
  if (addBtn) addBtn.style.display = isAdmin() ? "" : "none";

  const grid = document.getElementById("excursionsGrid");
  grid.innerHTML = "";

  if (!list.length) {
    grid.innerHTML = `<div class="empty-state"><i class="fas fa-bus"></i><p>Aucune excursion enregistrée</p></div>`;
    return;
  }

  list.forEach(e => {
    const pct      = e.capacite ? Math.min(100, Math.round((e.nb_inscrits / e.capacite) * 100)) : 0;
    const barClass = pct >= 90 ? 'prog-red' : pct >= 60 ? 'prog-orange' : 'prog-green';
    const isFam    = e.type === 'Famille';
    const isEC     = e.type === 'Employe_Conjoint';
    const dateStr  = e.date
      ? new Date(e.date).toLocaleDateString('fr-FR', {day:'numeric', month:'long', year:'numeric'})
      : '—';
    const typeIcoColor = isFam ? 'var(--g100)' : isEC ? 'var(--pink-l,#fce7f3)' : 'var(--blue-l)';
    const typeIco      = isFam ? 'fa-people-group' : isEC ? 'fa-person-half-dress' : 'fa-child';
    const typeIcoFg    = isFam ? 'var(--g600)' : isEC ? 'var(--pink,#db2777)' : 'var(--blue)';
    const badgeCls     = isFam ? 'b-green' : isEC ? 'b-pink' : 'b-blue';
    const typeLabel    = isFam ? 'Famille' : isEC ? 'Employé + Conjoint(e) / Célibataires' : (e.type || '—');

    const adminBtns = isAdmin() ? `
      <div class="exc-foot-admin">
        <button class="exc-btn e" onclick="editExcursion(${e.id},'${(e.ville||'').replace(/'/g,"\\'")}','${e.date||''}',${e.capacite||0},'${e.type||''}','${e.heure_depart||''}','${e.heure_retour||''}',${e.age_min_enfant??'null'},${e.age_max_enfant??'null'})">
          <i class="fas fa-pen"></i> Modifier
        </button>
        <button class="exc-btn danger" onclick="deleteExcursion(${e.id})" title="Supprimer">
          <i class="fas fa-trash"></i>
        </button>
      </div>` : '';

    grid.innerHTML += `
      <div class="exc-card">
        <div class="exc-head">
          <div class="exc-type-ico" style="background:${typeIcoColor}">
            <i class="fas ${typeIco}" style="color:${typeIcoFg}"></i>
          </div>
          <div class="exc-info">
            <div class="exc-city">${e.ville}</div>
            <div class="exc-date-sub"><i class="fas fa-calendar-alt"></i> ${dateStr}</div>
          </div>
          <span class="badge ${badgeCls}">${typeLabel}</span>
        </div>
        <div class="exc-body">
          ${(e.heure_depart || e.heure_retour) ? `
          <div class="exc-hours-row">
            ${e.heure_depart ? `<span class="exc-hour-item"><i class="fas fa-bus"></i> <strong>${e.heure_depart}</strong></span>` : ''}
            <span class="exc-hour-sep">→</span>
            ${e.heure_retour ? `<span class="exc-hour-item"><i class="fas fa-bus"></i> <strong>${e.heure_retour}</strong></span>` : ''}
          </div>` : ''}
          ${(e.age_min_enfant != null || e.age_max_enfant != null) ? `
          <div class="exc-row">
            <i class="fas fa-child"></i>
            <span>Enfants : <strong>${e.age_min_enfant ?? 0} – ${e.age_max_enfant ?? 17} ans</strong></span>
          </div>` : ''}
          <div class="exc-row">
            <i class="fas fa-users"></i>
            <span><strong>${e.nb_inscrits}</strong> / ${e.capacite} participants</span>
          </div>
          <div class="prog-wrap" style="margin-top:10px">
            <div class="prog-bar ${barClass}" style="width:${pct}%"></div>
          </div>
          <div class="prog-label">${pct}% rempli</div>
        </div>
        <div class="exc-foot">
          <button class="exc-btn" onclick="openInscrireExcursion(${e.id},'${e.ville.replace(/'/g,"\\'")}','${e.type||''}')">
            <i class="fas fa-user-plus"></i> Inscrire
          </button>
          <button class="exc-btn primary" onclick="showParticipantsExcursion(${e.id},'${e.ville.replace(/'/g,"\\'")}',${e.age_min_enfant??'null'},${e.age_max_enfant??'null'})">
            <i class="fas fa-users"></i> Participants
          </button>
          <button class="exc-btn" onclick="showProgrammeExcursion(${e.id},'${e.ville.replace(/'/g,"\\'")}')">
            <i class="fas fa-list-ul"></i> Programme
          </button>
        </div>
        ${adminBtns}
      </div>`;
  });
};

// ── Inscription excursion ──────────────────────────────────
window.openInscrireExcursion = async function (excId, excNom, excType) {
  document.getElementById("ins-exc-id").value      = excId;
  document.getElementById("ins-exc-exctype").value = excType || '';
  document.querySelector('#modal-inscrireExcursion .modal-title span').textContent = excNom;

  const typeSelect = document.getElementById("ins-exc-type");
  const typeWrap   = document.getElementById("ins-exc-type-wrap");

  if (excType === 'Enfants') {
    // Enfants uniquement → forcer enfant, masquer sélecteur
    typeSelect.innerHTML = `<option value="enfant">Enfant</option>`;
    typeSelect.value = 'enfant';
    if (typeWrap) typeWrap.style.display = 'none';
  } else if (excType === 'Employe_Conjoint') {
    // Employé + Conjoint(e) / Célibataires → pas d'enfant
    typeSelect.innerHTML = `
      <option value="employe">Employé</option>
      <option value="epouse">Épouse / Conjoint</option>`;
    typeSelect.value = 'employe';
    if (typeWrap) typeWrap.style.display = '';
  } else {
    // Famille → tous les types
    typeSelect.innerHTML = `
      <option value="employe">Employé</option>
      <option value="enfant">Enfant</option>
      <option value="epouse">Épouse / Conjoint</option>`;
    typeSelect.value = 'employe';
    if (typeWrap) typeWrap.style.display = '';
  }

  await loadInscrirePersonnes();
  openModal("inscrireExcursion");
};

window.loadInscrirePersonnes = async function () {
  const type = document.getElementById("ins-exc-type").value;
  const endpoints = { employe: "/employes", enfant: "/enfants", epouse: "/conjoints" };
  const sel = document.getElementById("ins-exc-personne");
  sel.innerHTML = `<option value="">Chargement…</option>`;
  try {
    const data = await apiFetch(endpoints[type]);
    const list = data.results || data;
    if (!list.length) {
      sel.innerHTML = `<option value="">Aucune personne disponible</option>`;
      return;
    }
    sel.innerHTML = list.map(p =>
      `<option value="${p.id}">${p.nom}${p.age ? ' (' + p.age + ' ans)' : ''}</option>`
    ).join('');
  } catch {
    sel.innerHTML = `<option value="">Erreur chargement</option>`;
  }
};

window.submitInscrireExcursion = async function () {
  const excId      = document.getElementById("ins-exc-id").value;
  const type       = document.getElementById("ins-exc-type").value;
  const personneId = document.getElementById("ins-exc-personne").value;
  if (!personneId) return showToast("Sélectionner une personne");
  try {
    const res = await apiFetch(`/excursions/${excId}/inscrire`, "POST", { type, personne_id: personneId });
    showToast(res.message || "Inscription réussie");
    closeModal("inscrireExcursion");
    loadExcursions();
  } catch (err) {
    showToast(err.message || "Erreur inscription", true);
  }
};

// ── Participants (groupés par âge pour enfants) ───────────
window.showParticipantsExcursion = async function (excId, excNom, ageMin, ageMax) {
  const body = document.getElementById("participantsExcursionBody");
  document.querySelector('#modal-participantsExcursion .modal-title span').textContent = excNom;
  body.innerHTML = `<p style="color:var(--ink4);text-align:center;padding:20px">Chargement…</p>`;
  openModal("participantsExcursion");
  try {
    const data = await apiFetch(`/excursions/${excId}/participants`);
    const list = data.results || data;

    if (!list.length) {
      body.innerHTML = `<div class="empty-state"><i class="fas fa-user-slash"></i><p>Aucun participant inscrit</p></div>`;
      return;
    }

    // Séparer adultes et enfants
    const employes = list.filter(p => p.type === 'employe');
    const epouses  = list.filter(p => p.type === 'epouse');
    const enfants  = list.filter(p => p.type === 'enfant');

    // Grouper enfants : tranche réelle de l'excursion si définie, sinon par intervalles de 3 ans
    let sortedGroups = [];
    if (enfants.length) {
      const hasRange = (ageMin != null || ageMax != null);
      if (hasRange) {
        // Une seule section avec la vraie tranche d'âge définie
        const label_min = ageMin != null ? ageMin : 0;
        const label_max = ageMax != null ? ageMax : 17;
        sortedGroups = [{ min: label_min, max: label_max, items: enfants }];
      } else {
        // Pas de restriction → regrouper par tranche d'âge de 3 ans
        const enfantGroups = {};
        enfants.forEach(p => {
          const age = parseInt(p.age) || 0;
          const min = Math.floor(age / 3) * 3;
          const max = min + 2;
          const key = `${min}-${max}`;
          enfantGroups[key] = enfantGroups[key] || { min, max, items: [] };
          enfantGroups[key].items.push(p);
        });
        sortedGroups = Object.values(enfantGroups).sort((a, b) => a.min - b.min);
      }
    }

    const renderRow = (p) => {
      const isFemme = (p.sexe || '').toLowerCase().includes('femme') || (p.sexe || '').toLowerCase() === 'f';
      let cls, ico, lbl;
      if (p.type === 'employe') {
        cls = isFemme ? 'b-pink' : 'b-blue';
        ico = 'fa-id-badge';
        lbl = isFemme ? 'Employée' : 'Employé';
      } else if (p.type === 'epouse') {
        cls = isFemme ? 'b-pink' : 'b-blue';
        ico = isFemme ? 'fa-venus' : 'fa-mars';
        lbl = isFemme ? 'Conjointe' : 'Conjoint';
      } else {
        // enfant
        const isFille = (p.genre || '').toLowerCase().includes('fil');
        cls = isFille ? 'b-pink' : 'b-blue';
        ico = 'fa-child';
        lbl = 'Enfant';
      }
      return `<tr>
        <td><strong>${p.nom || '—'}</strong></td>
        <td><span class="badge ${cls}"><i class="fas ${ico}"></i> ${lbl}</span></td>
        <td class="td-light">${p.detail || '—'}</td>
        ${(isAdmin() || isAgent()) ? `<td><button class="act-btn d" onclick="removeParticipantExcursion(${excId},${p.id})" title="Retirer"><i class="fas fa-times"></i></button></td>` : ''}
      </tr>`;
    };

    let html = '';

    // Section enfants regroupés par âge
    if (sortedGroups.length) {
      html += sortedGroups.map(g => `
        <div class="exc-age-section">
          <div class="exc-age-title">
            <i class="fas fa-child"></i> Enfants ${g.min}–${g.max} ans
            <span class="exc-age-count">${g.items.length}</span>
          </div>
          <table class="tbl">
            <thead><tr><th>Nom</th><th>Type</th><th>Détail</th>${(isAdmin() || isAgent()) ? '<th></th>' : ''}</tr></thead>
            <tbody>${g.items.map(renderRow).join('')}</tbody>
          </table>
        </div>`).join('');
    }

    // Section adultes (employés + épouses)
    const adultes = [...employes, ...epouses];
    if (adultes.length) {
      html += `
        <div class="exc-age-section">
          <div class="exc-age-title">
            <i class="fas fa-users"></i> Adultes (Employés & Épouses)
            <span class="exc-age-count">${adultes.length}</span>
          </div>
          <table class="tbl">
            <thead><tr><th>Nom</th><th>Type</th><th>Détail</th>${(isAdmin() || isAgent()) ? '<th></th>' : ''}</tr></thead>
            <tbody>${adultes.map(renderRow).join('')}</tbody>
          </table>
        </div>`;
    }

    body.innerHTML = html;
  } catch (err) {
    body.innerHTML = `<p style="color:var(--red);text-align:center;padding:20px"><i class="fas fa-triangle-exclamation"></i> ${err.message || 'Erreur chargement'}</p>`;
  }
};

window.removeParticipantExcursion = async function (excId, pid) {
  await apiFetch(`/excursions/${excId}/participants/${pid}`, "DELETE");
  showToast("Participant retiré");
  const nom = document.querySelector('#modal-participantsExcursion .modal-title span').textContent;
  showParticipantsExcursion(excId, nom);
  loadExcursions();
};

// ── Programme d'une excursion ─────────────────────────────
window.showProgrammeExcursion = async function (excId, excNom) {
  const body  = document.getElementById("programmeExcursionBody");
  const title = document.querySelector('#modal-programmeExcursion .modal-title span');
  if (title) title.textContent = excNom;
  document.getElementById("prog-exc-id").value = excId;

  const addForm = document.getElementById("prog-exc-add-form");
  if (addForm) addForm.style.display = isAdmin() ? "" : "none";

  body.innerHTML = `<p style="color:var(--ink4);text-align:center;padding:28px">Chargement…</p>`;
  openModal("programmeExcursion");
  await _reloadProgrammeExcursion(excId);
};

async function _reloadProgrammeExcursion(excId) {
  const body = document.getElementById("programmeExcursionBody");
  try {
    const data = await apiFetch(`/excursions/${excId}/programme`);
    const list = data.results || data;

    if (!list.length) {
      body.innerHTML = `<div class="empty-state"><i class="fas fa-calendar-times"></i><p>Aucune activité au programme</p></div>`;
      return;
    }

    body.innerHTML = `<div class="prog-timeline">${list.map(p => `
      <div class="prog-item">
        <div class="prog-heure">${p.heure || '—'}</div>
        <div class="prog-dot"></div>
        <div class="prog-content">
          <div class="prog-act">${p.activite}</div>
          ${p.description ? `<div class="prog-desc">${p.description}</div>` : ''}
        </div>
        ${isAdmin() ? `<div class="prog-item-actions">
          <button class="prog-edit-btn" onclick="editProgrammeExcursion(${excId},${p.id},'${p.heure||''}','${(p.activite||'').replace(/'/g,"\\'")}','${(p.description||'').replace(/'/g,"\\'")}')"><i class="fas fa-pen"></i></button>
          <button class="prog-del" onclick="deleteProgrammeExcursion(${excId},${p.id})" title="Supprimer"><i class="fas fa-times"></i></button>
        </div>` : ''}
      </div>`).join('')}
    </div>`;
  } catch {
    body.innerHTML = `<p style="color:var(--red);text-align:center">Erreur chargement</p>`;
  }
}

window.editProgrammeExcursion = function (excId, itemId, heure, activite, description) {
  document.getElementById("prog-exc-item-id").value = itemId;
  document.getElementById("prog-exc-heure").value = heure;
  document.getElementById("prog-exc-activite").value = activite;
  document.getElementById("prog-exc-desc").value = description;
  const btn = document.getElementById("prog-exc-submit-btn");
  btn.innerHTML = '<i class="fas fa-save"></i> Enregistrer';
  document.getElementById("prog-exc-cancel-btn").style.display = "";
};

window.cancelEditProgrammeExcursion = function () {
  document.getElementById("prog-exc-item-id").value = "";
  ["prog-exc-heure","prog-exc-activite","prog-exc-desc"]
    .forEach(id => document.getElementById(id).value = "");
  document.getElementById("prog-exc-submit-btn").innerHTML = '<i class="fas fa-plus"></i> Ajouter';
  document.getElementById("prog-exc-cancel-btn").style.display = "none";
};

window.submitAddProgrammeExcursion = async function () {
  const excId  = document.getElementById("prog-exc-id").value;
  const itemId = document.getElementById("prog-exc-item-id").value;
  const payload = {
    heure:       document.getElementById("prog-exc-heure").value,
    activite:    document.getElementById("prog-exc-activite").value,
    description: document.getElementById("prog-exc-desc").value
  };
  if (!payload.activite) return showToast("Activité requise");
  if (itemId) {
    await apiFetch(`/excursions/${excId}/programme/${itemId}`, "PUT", payload);
    showToast("Activité modifiée");
  } else {
    await apiFetch(`/excursions/${excId}/programme`, "POST", payload);
    showToast("Activité ajoutée");
  }
  cancelEditProgrammeExcursion();
  await _reloadProgrammeExcursion(excId);
};

window.deleteProgrammeExcursion = async function (excId, pid) {
  await apiFetch(`/excursions/${excId}/programme/${pid}`, "DELETE");
  showToast("Activité supprimée");
  await _reloadProgrammeExcursion(excId);
};

// ── CRUD excursions ────────────────────────────────────────
window.toggleExcAgeFields = function () {
  const type = document.getElementById("exc-type").value;
  const wrap = document.getElementById("exc-age-enfant-wrap");
  const allowsChildren = (type === 'Famille' || type === 'Enfants');
  if (wrap) wrap.style.display = allowsChildren ? '' : 'none';
};

window.openAddExcursion = function () {
  document.getElementById("exc-id").value = "";
  ["exc-ville","exc-date","exc-capacite","exc-age-min","exc-age-max"].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = "";
  });
  document.getElementById("exc-type").value = "Famille";
  toggleExcAgeFields();
  document.querySelector('#modal-addExcursion .modal-title').innerHTML =
    '<i class="fas fa-bus"></i> Nouvelle Excursion';
  document.querySelector('#modal-addExcursion .btn-primary').innerHTML =
    '<i class="fas fa-save"></i> Créer l\'excursion';
  openModal("addExcursion");
};

window.editExcursion = function (id, ville, date, capacite, type, heure_depart, heure_retour, age_min, age_max) {
  document.getElementById("exc-id").value        = id;
  document.getElementById("exc-ville").value     = ville;
  document.getElementById("exc-date").value      = date ? date.substring(0, 10) : "";
  document.getElementById("exc-capacite").value  = capacite || "";
  document.getElementById("exc-type").value      = type || "Famille";
  document.getElementById("exc-depart").value    = heure_depart || "";
  document.getElementById("exc-retour").value    = heure_retour || "";
  const amin = document.getElementById("exc-age-min"); if (amin) amin.value = age_min || "";
  const amax = document.getElementById("exc-age-max"); if (amax) amax.value = age_max || "";
  toggleExcAgeFields();
  document.querySelector('#modal-addExcursion .modal-title').innerHTML =
    '<i class="fas fa-pen"></i> Modifier l\'Excursion';
  document.querySelector('#modal-addExcursion .btn-primary').innerHTML =
    '<i class="fas fa-save"></i> Enregistrer';
  openModal("addExcursion");
};

window.submitAddExcursion = async function () {
  const id = document.getElementById("exc-id").value;
  const ageMinEl = document.getElementById("exc-age-min");
  const ageMaxEl = document.getElementById("exc-age-max");
  const payload = {
    ville:           document.getElementById("exc-ville").value,
    date:            document.getElementById("exc-date").value,
    capacite:        document.getElementById("exc-capacite").value,
    type:            document.getElementById("exc-type").value,
    heure_depart:    document.getElementById("exc-depart").value,
    heure_retour:    document.getElementById("exc-retour").value,
    age_min_enfant:  ageMinEl && ageMinEl.value ? parseInt(ageMinEl.value) : null,
    age_max_enfant:  ageMaxEl && ageMaxEl.value ? parseInt(ageMaxEl.value) : null,
  };
  if (!payload.ville)    return showToast("Ville / destination requise", true);
  if (!payload.date)     return showToast("Date requise", true);
  if (!payload.capacite) return showToast("Capacité requise", true);
  try {
    if (id) {
      await apiFetch("/excursions/" + id, "PUT", payload);
      showToast("Excursion modifiée");
    } else {
      await apiFetch("/excursions", "POST", payload);
      showToast("Excursion ajoutée");
    }
    document.getElementById("exc-id").value = "";
    closeModal("addExcursion");
    loadExcursions();
    loadDashboard();
  } catch (err) {
    showToast(err.message || "Erreur lors de la sauvegarde", true);
  }
};

window.deleteExcursion = async function (id) {
  try {
    await apiFetch("/excursions/" + id, "DELETE");
    showToast("Excursion supprimée");
    loadExcursions();
    loadDashboard();
  } catch (err) {
    showToast(err.message || "Erreur suppression", true);
  }
};
