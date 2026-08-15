// ── Utilitaires ──────────────────────────────────────────
function _fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function _genreLabel(g) {
  const l = (g || '').toLowerCase();
  if (l === 'garcon') return { ico: '♂', lbl: 'Garçons', cls: 'b-blue' };
  if (l === 'fille')  return { ico: '♀', lbl: 'Filles',  cls: 'b-pink' };
  return { ico: '⊕', lbl: 'Mixte', cls: 'b-green' };
}

function _initiales(nom) {
  return (nom || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
}

// ── Chargement des camps ──────────────────────────────────
window.loadCamps = async function () {
  const data = await apiFetch("/camps");
  const list = data.results || data;

  const badge = document.getElementById("nb-camps");
  if (badge) badge.textContent = list.length;
  const count = document.getElementById("camps-count");
  if (count) count.textContent = `${list.length} camp${list.length !== 1 ? 's' : ''} enregistré${list.length !== 1 ? 's' : ''}`;

  const addBtn = document.getElementById("btn-add-camp");
  if (addBtn) addBtn.style.display = isAdmin() ? "" : "none";

  const grid = document.getElementById("campsGrid");
  grid.innerHTML = "";

  if (!list.length) {
    grid.innerHTML = `<div class="empty-state"><i class="fas fa-campground"></i><p>Aucun camp enregistré</p></div>`;
    return;
  }

  const accents = [
    'linear-gradient(135deg,#2a8a52,#65c98a)',
    'linear-gradient(135deg,#1a6fa8,#5dade2)',
    'linear-gradient(135deg,#5b21b6,#a78bfa)',
    'linear-gradient(135deg,#c8943f,#f0c060)',
    'linear-gradient(135deg,#be185d,#f472b6)',
    'linear-gradient(135deg,#d4720a,#f5a623)'
  ];

  list.forEach((c, i) => {
    const pct      = c.capacite ? Math.min(100, Math.round((c.nb_inscrits / c.capacite) * 100)) : 0;
    const barClass = pct >= 90 ? 'prog-red' : pct >= 60 ? 'prog-orange' : 'prog-green';
    const accent   = accents[i % accents.length];

    // Badges groupes
    const groupesBadges = (c.groupes || []).map(g => {
      const gd = _genreLabel(g.genre);
      return `<span class="camp-grp-badge ${g.genre === 'fille' ? 'grpb-pink' : g.genre === 'garcon' ? 'grpb-blue' : 'grpb-green'}" title="${g.encadrant_nom ? 'Encadrant: ' + g.encadrant_nom : ''}">
        ${gd.ico} ${g.nom} · ${g.age_min}–${g.age_max} · ${g.nb_membres}
      </span>`;
    }).join('');

    grid.innerHTML += `
      <div class="camp-card">
        <div class="camp-accent" style="background:${accent}"></div>
        <div class="camp-body">
          <div class="camp-name">${c.nom}</div>
          <div class="camp-city">
            <i class="fas fa-location-dot"></i> ${c.ville_depart || 'Khouribga'}
            <i class="fas fa-arrow-right" style="margin:0 6px;font-size:10px;color:var(--ink4)"></i>
            <i class="fas fa-map-marker-alt"></i> ${c.ville}
          </div>

          <div class="camp-dates-row">
            ${c.date_debut ? `<div class="camp-date-item"><div class="camp-date-lbl">DÉPART</div><div class="camp-date-val">${_fmtDate(c.date_debut)}</div></div>` : ''}
            ${c.date_fin   ? `<div class="camp-date-item"><div class="camp-date-lbl">RETOUR</div><div class="camp-date-val">${_fmtDate(c.date_fin)}</div></div>`   : ''}
            <div class="camp-date-item"><div class="camp-date-lbl">PLACES</div><div class="camp-date-val">${c.nb_inscrits}/${c.capacite}</div></div>
            <div class="camp-date-item"><div class="camp-date-lbl">ÂGES</div><div class="camp-date-val">${c.age_min != null ? c.age_min : '?'}–${c.age_max != null ? c.age_max : '?'} ans</div></div>
          </div>
          ${(c.heure_depart || c.heure_retour) ? `
          <div class="camp-hours-row">
            ${c.heure_depart ? `<span class="camp-hour-item"><i class="fas fa-bus"></i> Départ <strong>${c.heure_depart}</strong></span>` : ''}
            ${c.heure_retour ? `<span class="camp-hour-item"><i class="fas fa-bus"></i> Retour <strong>${c.heure_retour}</strong></span>` : ''}
          </div>` : ''}

          <div class="prog-wrap">
            <div class="prog-bar ${barClass}" style="width:${pct}%"></div>
          </div>
          <div class="prog-label">${pct}% rempli — ${c.nb_inscrits} / ${c.capacite} places</div>

          ${groupesBadges ? `<div class="camp-groupes-row">${groupesBadges}</div>` : ''}
        </div>

        <div class="camp-foot">
          <button class="camp-btn" onclick="openInscrireCamp(${c.id},'${(c.nom||'').replace(/'/g,"\\'")}')">
            <i class="fas fa-user-plus"></i> Inscrire
          </button>
          <button class="camp-btn primary" onclick="showParticipantsCamp(${c.id},'${(c.nom||'').replace(/'/g,"\\'")}')">
            <i class="fas fa-users"></i> Participants
          </button>
          <button class="camp-btn" onclick="showGroupeCamp(${c.id},'${(c.nom||'').replace(/'/g,"\\'")}')">
            <i class="fas fa-object-group"></i> Groupes
          </button>
        </div>
        <div class="camp-foot-sec">
          <button class="camp-btn-sec" onclick="showProgrammeCamp(${c.id},'${(c.nom||'').replace(/'/g,"\\'")}')">
            <i class="fas fa-list-ul"></i> Programme
          </button>
        </div>
        ${isAdmin() ? `
        <div class="camp-foot-admin">
          <button class="camp-btn e" onclick="editCamp(${c.id},'${(c.nom||'').replace(/'/g,"\\'")}','${(c.ville||'').replace(/'/g,"\\'")}',${c.capacite||0},${c.age_min??'null'},${c.age_max??'null'},'${c.date_debut||''}','${c.date_fin||''}','${c.heure_depart||''}','${c.heure_retour||''}','${(c.ville_depart||'Khouribga').replace(/'/g,"\\'")}')">
            <i class="fas fa-pen"></i> Modifier
          </button>
          <button class="camp-btn danger" onclick="deleteCamp(${c.id})">
            <i class="fas fa-trash"></i>
          </button>
        </div>` : ''}
      </div>`;
  });
};

// ── Inscription camp ──────────────────────────────────────
window.openInscrireCamp = async function (campId, campNom) {
  document.getElementById("ins-camp-id").value = campId;
  document.querySelector('#modal-inscrireCamp .modal-title span').textContent = campNom;

  const sel  = document.getElementById("ins-camp-enfant");
  const info = document.getElementById("ins-camp-info");
  sel.innerHTML = `<option value="">Chargement…</option>`;
  if (info) info.textContent = '';
  openModal("inscrireCamp");

  try {
    const res = await apiFetch(`/camps/${campId}/enfants-eligibles`);
    const { enfants, age_min, age_max, annee } = res;

    const eligibles   = enfants.filter(e => !e.camp_annee_existant);
    const ineligibles = enfants.filter(e => e.camp_annee_existant);

    sel.innerHTML = '';

    if (!eligibles.length && !ineligibles.length) {
      sel.innerHTML = `<option value="">Aucun enfant dans la tranche ${age_min}–${age_max} ans</option>`;
      return;
    }

    // Groupe 1 : enfants éligibles
    if (eligibles.length) {
      const grp = document.createElement('optgroup');
      grp.label = `✅ Éligibles (${age_min}–${age_max} ans, sans camp ${annee || 'cette année'})`;
      eligibles.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.id;
        opt.textContent = `${e.nom} — ${e.age} ans · ${e.genre || ''} (${e.employe_nom || 'parent inconnu'})`;
        grp.appendChild(opt);
      });
      sel.appendChild(grp);
    }

    // Groupe 2 : enfants déjà inscrits à un autre camp cette année (désactivés)
    if (ineligibles.length) {
      const grp = document.createElement('optgroup');
      grp.label = `⛔ Déjà inscrits à un camp ${annee || 'cette année'}`;
      ineligibles.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.id;
        opt.disabled = true;
        opt.textContent = `${e.nom} — ${e.age} ans · Camp : ${e.camp_annee_existant}`;
        grp.appendChild(opt);
      });
      sel.appendChild(grp);
    }

    if (info && ineligibles.length) {
      info.textContent = `${ineligibles.length} enfant(s) déjà inscrits à un camp cette année (grisés).`;
    }
  } catch (err) {
    sel.innerHTML = `<option value="">Erreur chargement</option>`;
    showToast(err.message || 'Erreur chargement', true);
  }
};

window.submitInscrireCamp = async function () {
  const campId   = document.getElementById("ins-camp-id").value;
  const enfantId = document.getElementById("ins-camp-enfant").value;
  if (!enfantId) return showToast("Sélectionner un enfant");
  try {
    const res = await apiFetch(`/camps/${campId}/inscrire`, "POST", { enfant_id: enfantId });
    showToast(res.message || "Enfant inscrit au camp");
    closeModal("inscrireCamp");
    loadCamps();
  } catch (err) {
    showToast(err.message || "Erreur inscription", true);
  }
};

// ── Groupes d'un camp ─────────────────────────────────────
window.showGroupeCamp = async function (campId, campNom) {
  const body  = document.getElementById("groupeCampBody");
  const title = document.querySelector('#modal-groupeCamp .modal-title span');
  if (title) title.textContent = campNom;

  // Stocker l'ID du camp pour le bouton "Nouveau groupe"
  document.getElementById("grp-camp-id").value = campId;

  const addGrpBtn = document.getElementById("btn-add-groupe");
  if (addGrpBtn) addGrpBtn.style.display = isAdmin() ? "" : "none";

  body.innerHTML = `<p style="color:var(--ink4);text-align:center;padding:28px">Chargement…</p>`;
  openModal("groupeCamp");

  try {
    const groupes = await apiFetch(`/camps/${campId}/groupes`);
    const list = groupes.results || groupes;

    if (!list.length) {
      body.innerHTML = `<div class="empty-state"><i class="fas fa-users-slash"></i><p>Aucun groupe créé pour ce camp</p>${isAdmin() ? '<p style="font-size:13px;color:var(--ink4)">Cliquez sur « Nouveau groupe » pour commencer</p>' : ''}</div>`;
      return;
    }

    body.innerHTML = list.map(g => {
      const isSansGroupe = g.sans_groupe === true;
      const gd  = _genreLabel(g.genre);
      const pct = g.capacite ? Math.round((g.nb_membres / g.capacite) * 100) : 0;

      const hasMauvais = (g.membres || []).some(m => m.mauvais_groupe);
      const membres = (g.membres || []).map(m => {
        const ini    = _initiales(m.nom);
        const bg     = (m.genre || '').toLowerCase().includes('fil') ? 'var(--pink)' : 'var(--blue)';
        const errBadge = m.mauvais_groupe
          ? `<span title="Âge ou genre ne correspond pas à ce groupe" style="font-size:11px;color:var(--red);font-weight:700;margin-left:4px">⚠ Mal placé</span>`
          : '';
        return `
          <div class="membre-card" style="${m.mauvais_groupe ? 'border:1px solid var(--red-l);background:rgba(220,38,38,.04)' : ''}">
            <div class="membre-av" style="background:${bg}">${ini}</div>
            <div class="membre-info">
              <div class="membre-nom">${m.nom}${errBadge}</div>
              <div class="membre-age">${m.age} ans · ${m.genre || ''}</div>
            </div>
            ${(isAdmin() || isAgent()) ? `<button class="membre-del" title="Retirer" onclick="removeParticipantCamp(${campId},${m.id})"><i class="fas fa-times"></i></button>` : ''}
          </div>`;
      }).join('');

      const vide = !g.membres || !g.membres.length
        ? `<div class="groupe-empty">Aucun membre pour l'instant</div>` : '';

      if (isSansGroupe) {
        return `
          <div class="groupe-card" style="border:2px dashed var(--border)">
            <div class="groupe-card-head" style="background:var(--slate);border-radius:var(--r12) var(--r12) 0 0">
              <div class="gch-left">
                <span class="gch-ico" style="color:var(--ink4)">⊘</span>
                <div>
                  <div class="gch-nom" style="color:var(--ink3)">Sans groupe assigné</div>
                  <div class="gch-enc" style="color:var(--ink4)">${g.nb_membres} enfant(s) — assignation automatique disponible</div>
                </div>
              </div>
              <button class="btn btn-primary" style="font-size:12px;padding:6px 14px"
                onclick="reassignerGroupes(${campId})">
                <i class="fas fa-wand-magic-sparkles"></i> Assigner auto
              </button>
            </div>
            <div class="groupe-membres">${membres}${vide}</div>
          </div>`;
      }

      const warnBanner = hasMauvais ? `
        <div style="background:rgba(220,38,38,.08);border-top:1px solid rgba(220,38,38,.2);padding:8px 16px;display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--red)">
          <span><i class="fas fa-triangle-exclamation"></i> Des enfants ne correspondent pas aux critères de ce groupe</span>
          ${(isAdmin() || isAgent()) ? `<button class="btn btn-primary" style="font-size:11px;padding:4px 12px" onclick="reassignerGroupes(${campId})"><i class="fas fa-wand-magic-sparkles"></i> Corriger auto</button>` : ''}
        </div>` : '';

      return `
        <div class="groupe-card">
          <div class="groupe-card-head ${g.genre === 'fille' ? 'gch-pink' : g.genre === 'garcon' ? 'gch-blue' : 'gch-green'}">
            <div class="gch-left">
              <span class="gch-ico">${gd.ico}</span>
              <div>
                <div class="gch-nom">${g.nom} · ${gd.lbl} ${g.age_min}–${g.age_max} ans</div>
                ${g.encadrant_nom ? `<div class="gch-enc"><i class="fas fa-user-tie"></i> ${g.encadrant_nom}</div>` : ''}
              </div>
            </div>
            <div class="gch-right">
              <span class="gch-cap">${g.nb_membres} / ${g.capacite}</span>
              ${isAdmin() ? `
                <button class="gch-edit" onclick="editGroupeCamp(${campId},${g.id},'${(g.nom||'').replace(/'/g,"\\'")}','${g.genre||'mixte'}',${g.age_min??0},${g.age_max??99},${g.capacite??20},${g.encadrant_id??'null'})" title="Modifier groupe"><i class="fas fa-pen"></i></button>
                <button class="gch-del" onclick="deleteGroupeCamp(${campId},${g.id})" title="Supprimer groupe"><i class="fas fa-trash"></i></button>` : ''}
            </div>
          </div>
          <div class="gch-prog-wrap"><div class="gch-prog-bar" style="width:${pct}%;background:${g.genre==='fille'?'var(--pink)':g.genre==='garcon'?'var(--blue)':'var(--green)'}"></div></div>
          ${warnBanner}
          <div class="groupe-membres">${membres}${vide}</div>
        </div>`;
    }).join('');

  } catch (err) {
    body.innerHTML = `<p style="color:var(--red);text-align:center;padding:20px"><i class="fas fa-triangle-exclamation"></i> ${err.message || 'Erreur chargement'}</p>`;
  }
};

window.removeParticipantCamp = async function (campId, pid) {
  await apiFetch(`/camps/${campId}/participants/${pid}`, "DELETE");
  showToast("Enfant retiré du camp");
  const nom = document.querySelector('#modal-groupeCamp .modal-title span').textContent;
  showGroupeCamp(campId, nom);
  loadCamps();
};

window.reassignerGroupes = async function (campId) {
  try {
    const res = await apiFetch(`/camps/${campId}/reassigner-groupes`, "POST");
    showToast(res.message, res.failed && res.failed.length > 0);
    const nom = document.querySelector('#modal-groupeCamp .modal-title span').textContent;
    showGroupeCamp(campId, nom);
    loadCamps();
  } catch (err) {
    showToast(err.message || "Erreur réassignation", true);
  }
};

window.removeParticipantCampFromList = async function (campId, pid) {
  try {
    await apiFetch(`/camps/${campId}/participants/${pid}`, "DELETE");
    showToast("Enfant retiré du camp");
    const nom = document.querySelector('#modal-participantsCamp .modal-title span').textContent;
    await showParticipantsCamp(campId, nom);
    loadCamps();
  } catch (err) {
    showToast(err.message || "Erreur suppression", true);
  }
};

window.showParticipantsCamp = async function (campId, campNom) {
  const body  = document.getElementById("participantsCampBody");
  const title = document.querySelector('#modal-participantsCamp .modal-title span');
  if (title) title.textContent = campNom;
  // Stocker l'id pour le refresh après suppression
  document.getElementById("modal-participantsCamp").dataset.campId = campId;
  body.innerHTML = `<p style="color:var(--ink4);text-align:center;padding:28px">Chargement…</p>`;
  openModal("participantsCamp");
  try {
    const data = await apiFetch(`/camps/${campId}/participants`);
    const list = data.results || data;

    if (!list.length) {
      body.innerHTML = `<div class="empty-state"><i class="fas fa-user-slash"></i><p>Aucun participant inscrit</p></div>`;
      return;
    }

    const canDel = isAdmin() || isAgent();
    body.innerHTML = `
      <table class="tbl">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Âge</th>
            <th>Genre</th>
            <th>Employé parent</th>
            <th>Groupe</th>
            ${canDel ? '<th></th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${list.map(p => {
            const genreLabel = (p.genre||'').toLowerCase().includes('fil') ? `<span class="badge b-pink">♀ Fille</span>` : `<span class="badge b-blue">♂ Garçon</span>`;
            return `<tr>
              <td><strong>${p.nom || '—'}</strong></td>
              <td>${p.age ? p.age + ' ans' : '—'}</td>
              <td>${genreLabel}</td>
              <td class="td-light">${p.employe_nom || '—'}</td>
              <td>${p.groupe_nom ? `<span class="badge b-green">${p.groupe_nom}</span>` : '<span class="badge" style="background:var(--g100);color:var(--g600)">Sans groupe</span>'}</td>
              ${canDel ? `<td><button class="act-btn d" onclick="removeParticipantCampFromList(${campId},${p.id})" title="Retirer"><i class="fas fa-times"></i></button></td>` : ''}
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    body.innerHTML = `<p style="color:var(--red);text-align:center;padding:20px"><i class="fas fa-triangle-exclamation"></i> ${err.message || 'Erreur chargement'}</p>`;
  }
};

// ── Ajouter un groupe ─────────────────────────────────────
window.openAddGroupe = async function () {
  document.getElementById("grp-id").value       = "";
  document.getElementById("grp-nom").value      = "";
  document.getElementById("grp-age-min").value  = "";
  document.getElementById("grp-age-max").value  = "";
  document.getElementById("grp-capacite").value = "20";
  document.getElementById("grp-genre").value    = "garcon";
  document.querySelector('#modal-addGroupe .modal-title').innerHTML = '<i class="fas fa-object-group"></i> Nouveau Groupe';
  document.querySelector('#modal-addGroupe .btn-primary').innerHTML = '<i class="fas fa-save"></i> Créer';
  await loadEncadrantsSelect("grp-encadrant-id", null);
  openModal("addGroupe");
};

window.editGroupeCamp = async function (campId, groupeId, nom, genre, age_min, age_max, capacite, encadrant_id) {
  document.getElementById("grp-id").value       = groupeId;
  document.getElementById("grp-nom").value      = nom;
  document.getElementById("grp-genre").value    = genre;
  document.getElementById("grp-age-min").value  = age_min;
  document.getElementById("grp-age-max").value  = age_max;
  document.getElementById("grp-capacite").value = capacite;
  document.querySelector('#modal-addGroupe .modal-title').innerHTML = '<i class="fas fa-pen"></i> Modifier le Groupe';
  document.querySelector('#modal-addGroupe .btn-primary').innerHTML = '<i class="fas fa-save"></i> Enregistrer';
  await loadEncadrantsSelect("grp-encadrant-id", encadrant_id);
  openModal("addGroupe");
};

window.submitAddGroupe = async function () {
  const campId   = document.getElementById("grp-camp-id").value;
  const groupeId = document.getElementById("grp-id").value;
  const payload = {
    nom:          document.getElementById("grp-nom").value,
    genre:        document.getElementById("grp-genre").value,
    age_min:      parseInt(document.getElementById("grp-age-min").value) || 0,
    age_max:      parseInt(document.getElementById("grp-age-max").value) || 99,
    capacite:     parseInt(document.getElementById("grp-capacite").value) || 20,
    encadrant_id: document.getElementById("grp-encadrant-id").value || null
  };
  if (!payload.nom) return showToast("Nom du groupe requis");
  try {
    if (groupeId) {
      await apiFetch(`/camps/${campId}/groupes/${groupeId}`, "PUT", payload);
      showToast("Groupe modifié");
    } else {
      await apiFetch(`/camps/${campId}/groupes`, "POST", payload);
      showToast("Groupe créé — assignation automatique en cours…");
      try {
        const res = await apiFetch(`/camps/${campId}/reassigner-groupes`, "POST");
        if (res.assigned > 0) showToast(res.message);
      } catch {}
    }
    closeModal("addGroupe");
    const nom = document.querySelector('#modal-groupeCamp .modal-title span').textContent;
    showGroupeCamp(campId, nom);
    loadCamps();
  } catch (err) {
    showToast(err.message || "Erreur sauvegarde groupe", true);
  }
};

window.deleteGroupeCamp = async function (campId, groupeId) {
  await apiFetch(`/camps/${campId}/groupes/${groupeId}`, "DELETE");
  showToast("Groupe supprimé");
  const nom = document.querySelector('#modal-groupeCamp .modal-title span').textContent;
  showGroupeCamp(campId, nom);
  loadCamps();
};

// ── Programme d'un camp ────────────────────────────────────
window.showProgrammeCamp = async function (campId, campNom) {
  const body  = document.getElementById("programmeCampBody");
  const title = document.querySelector('#modal-programmeCamp .modal-title span');
  if (title) title.textContent = campNom;
  document.getElementById("prog-camp-id").value = campId;

  const addBtn = document.getElementById("prog-camp-add-form");
  if (addBtn) addBtn.style.display = isAdmin() ? "" : "none";

  body.innerHTML = `<p style="color:var(--ink4);text-align:center;padding:28px">Chargement…</p>`;
  openModal("programmeCamp");
  await _reloadProgrammeCamp(campId);
};

async function _reloadProgrammeCamp(campId) {
  const body = document.getElementById("programmeCampBody");
  try {
    const data = await apiFetch(`/camps/${campId}/programme`);
    const list = data.results || data;

    if (!list.length) {
      body.innerHTML = `<div class="empty-state"><i class="fas fa-calendar-times"></i><p>Aucune activité au programme</p></div>`;
      return;
    }

    // Grouper par jour
    const byJour = {};
    list.forEach(p => {
      const k = p.jour || 'Sans date';
      byJour[k] = byJour[k] || [];
      byJour[k].push(p);
    });

    body.innerHTML = Object.entries(byJour).map(([jour, items]) => `
      <div class="prog-jour-section">
        <div class="prog-jour-title"><i class="fas fa-calendar-day"></i> ${jour}</div>
        ${items.map(p => `
          <div class="prog-item">
            <div class="prog-heure">${p.heure || '—'}</div>
            <div class="prog-dot"></div>
            <div class="prog-content">
              <div class="prog-act">${p.activite}</div>
              ${p.description ? `<div class="prog-desc">${p.description}</div>` : ''}
            </div>
            ${isAdmin() ? `<div class="prog-item-actions">
              <button class="prog-edit-btn" onclick="editProgrammeCamp(${campId},${p.id},'${(p.jour||'').replace(/'/g,"\\'")}','${p.heure||''}','${(p.activite||'').replace(/'/g,"\\'")}','${(p.description||'').replace(/'/g,"\\'")}')"><i class="fas fa-pen"></i></button>
              <button class="prog-del" onclick="deleteProgrammeCamp(${campId},${p.id})" title="Supprimer"><i class="fas fa-times"></i></button>
            </div>` : ''}
          </div>`).join('')}
      </div>`).join('');
  } catch {
    body.innerHTML = `<p style="color:var(--red);text-align:center">Erreur chargement</p>`;
  }
}

window.editProgrammeCamp = function (campId, itemId, jour, heure, activite, description) {
  document.getElementById("prog-camp-item-id").value = itemId;
  document.getElementById("prog-camp-jour").value = jour;
  document.getElementById("prog-camp-heure").value = heure;
  document.getElementById("prog-camp-activite").value = activite;
  document.getElementById("prog-camp-desc").value = description;
  const btn = document.getElementById("prog-camp-submit-btn");
  btn.innerHTML = '<i class="fas fa-save"></i> Enregistrer';
  document.getElementById("prog-camp-cancel-btn").style.display = "";
};

window.cancelEditProgrammeCamp = function () {
  document.getElementById("prog-camp-item-id").value = "";
  ["prog-camp-jour","prog-camp-heure","prog-camp-activite","prog-camp-desc"]
    .forEach(id => document.getElementById(id).value = "");
  document.getElementById("prog-camp-submit-btn").innerHTML = '<i class="fas fa-plus"></i> Ajouter';
  document.getElementById("prog-camp-cancel-btn").style.display = "none";
};

window.submitAddProgrammeCamp = async function () {
  const campId = document.getElementById("prog-camp-id").value;
  const itemId = document.getElementById("prog-camp-item-id").value;
  const payload = {
    jour:        document.getElementById("prog-camp-jour").value,
    heure:       document.getElementById("prog-camp-heure").value,
    activite:    document.getElementById("prog-camp-activite").value,
    description: document.getElementById("prog-camp-desc").value
  };
  if (!payload.activite) return showToast("Activité requise");
  if (itemId) {
    await apiFetch(`/camps/${campId}/programme/${itemId}`, "PUT", payload);
    showToast("Activité modifiée");
  } else {
    await apiFetch(`/camps/${campId}/programme`, "POST", payload);
    showToast("Activité ajoutée");
  }
  cancelEditProgrammeCamp();
  await _reloadProgrammeCamp(campId);
};

window.deleteProgrammeCamp = async function (campId, pid) {
  await apiFetch(`/camps/${campId}/programme/${pid}`, "DELETE");
  showToast("Activité supprimée");
  await _reloadProgrammeCamp(campId);
};

// ── CRUD camps ─────────────────────────────────────────────
window.openAddCamp = function () {
  document.getElementById("camp-id").value = "";
  ["camp-nom","camp-ville","camp-debut","camp-fin","camp-age-min","camp-age-max","camp-capacite","camp-h-depart","camp-h-retour"]
    .forEach(id => document.getElementById(id).value = "");
  const vd = document.getElementById("camp-ville-depart"); if (vd) vd.value = "Khouribga";
  const vr = document.getElementById("camp-ville-retour"); if (vr) vr.value = "Khouribga";
  document.querySelector('#modal-addCamp .modal-title').innerHTML =
    '<i class="fas fa-campground"></i> Nouveau Camp d\'Été';
  document.querySelector('#modal-addCamp .btn-primary').innerHTML =
    '<i class="fas fa-save"></i> Créer le camp';
  openModal("addCamp");
};

window.editCamp = function (id, nom, ville, capacite, age_min, age_max, date_debut, date_fin, heure_depart, heure_retour, ville_depart) {
  document.getElementById("camp-id").value        = id;
  document.getElementById("camp-nom").value       = nom;
  document.getElementById("camp-ville").value     = ville;
  document.getElementById("camp-capacite").value  = capacite || "";
  document.getElementById("camp-age-min").value   = age_min  || "";
  document.getElementById("camp-age-max").value   = age_max  || "";
  document.getElementById("camp-debut").value     = date_debut || "";
  document.getElementById("camp-fin").value       = date_fin   || "";
  document.getElementById("camp-h-depart").value  = heure_depart || "";
  document.getElementById("camp-h-retour").value  = heure_retour || "";
  const vdEl = document.getElementById("camp-ville-depart"); if (vdEl) vdEl.value = ville_depart || "Khouribga";
  document.querySelector('#modal-addCamp .modal-title').innerHTML =
    '<i class="fas fa-pen"></i> Modifier le Camp';
  document.querySelector('#modal-addCamp .btn-primary').innerHTML =
    '<i class="fas fa-save"></i> Enregistrer';
  openModal("addCamp");
};

window.submitAddCamp = async function () {
  const id = document.getElementById("camp-id").value;
  const vdEl = document.getElementById("camp-ville-depart");
  const payload = {
    nom:          document.getElementById("camp-nom").value,
    ville:        document.getElementById("camp-ville").value,
    ville_depart: vdEl ? (vdEl.value || "Khouribga") : "Khouribga",
    capacite:     document.getElementById("camp-capacite").value,
    age_min:      document.getElementById("camp-age-min").value,
    age_max:      document.getElementById("camp-age-max").value,
    date_debut:   document.getElementById("camp-debut").value,
    date_fin:     document.getElementById("camp-fin").value,
    heure_depart: document.getElementById("camp-h-depart").value,
    heure_retour: document.getElementById("camp-h-retour").value
  };
  if (id) {
    await apiFetch("/camps/" + id, "PUT", payload);
    showToast("Camp modifié");
  } else {
    await apiFetch("/camps", "POST", payload);
    showToast("Camp ajouté");
  }
  document.getElementById("camp-id").value = "";
  closeModal("addCamp");
  loadCamps();
  loadDashboard();
};

window.deleteCamp = async function (id) {
  await apiFetch("/camps/" + id, "DELETE");
  loadCamps();
  loadDashboard();
};
