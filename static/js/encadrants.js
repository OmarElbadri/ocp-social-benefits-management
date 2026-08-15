// ── Utilitaire couleur avatar ─────────────────────────────
function _encColor(nom) {
  const colors = ['#2a8a52','#1a6fa8','#5b21b6','#c8943f','#be185d','#d4720a','#0e7490','#065f46'];
  let h = 0;
  for (let i = 0; i < (nom||'').length; i++) h = (h * 31 + nom.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(h) % colors.length];
}

// ── Chargement des encadrants ─────────────────────────────
window.loadEncadrants = async function () {
  const grid    = document.getElementById("encadrantsGrid");
  const countEl = document.getElementById("encadrants-count");
  const badge   = document.getElementById("nb-encadrants");

  try {
    const data = await apiFetch("/encadrants");
    const list = data.results || data;

    if (badge)   badge.textContent = list.length;
    if (countEl) countEl.textContent =
      `${list.length} encadrant${list.length !== 1 ? 's' : ''} enregistré${list.length !== 1 ? 's' : ''}`;

    const addBtn = document.getElementById("btn-add-encadrant");
    if (addBtn) addBtn.style.display = (isAdmin() || isAgent()) ? "" : "none";

    if (!grid) return;
    grid.innerHTML = "";

    if (!list.length) {
      grid.innerHTML = `<div class="empty-state"><i class="fas fa-person-chalkboard"></i><p>Aucun encadrant enregistré</p></div>`;
      return;
    }

    list.forEach(enc => {
      const ini     = (enc.nom || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
      const bg      = _encColor(enc.nom);
      const sexeIco = enc.sexe === 'Femme' ? 'fa-venus' : enc.sexe === 'Homme' ? 'fa-mars' : 'fa-genderless';
      const sexeCls = enc.sexe === 'Femme' ? 'enc-f' : 'enc-m';

      const editBtn = (isAdmin() || isAgent()) ? `
        <button class="enc-btn-edit" onclick="openEditEncadrant(${enc.id},'${(enc.nom||'').replace(/'/g,"\\'")}','${enc.sexe||''}',${enc.age||'null'},'${(enc.specialite||'').replace(/'/g,"\\'")}','${enc.telephone||''}','${enc.email||''}')">
          <i class="fas fa-pen"></i>
        </button>` : '';
      const delBtn = isAdmin() ? `
        <button class="enc-btn-del" onclick="deleteEncadrant(${enc.id})">
          <i class="fas fa-trash"></i>
        </button>` : '';
      const adminBtns = editBtn + delBtn;

      grid.innerHTML += `
        <div class="enc-card">
          <div class="enc-card-top">
            <div class="enc-av" style="background:${bg}">${ini}</div>
            <div class="enc-card-actions">${adminBtns}</div>
          </div>
          <div class="enc-card-body">
            <div class="enc-nom">${enc.nom}</div>
            <div class="enc-meta-row">
              ${enc.sexe ? `<span class="enc-meta-item ${sexeCls}"><i class="fas ${sexeIco}"></i> ${enc.sexe}</span>` : ''}
              ${enc.age  ? `<span class="enc-meta-item"><i class="fas fa-cake-candles"></i> ${enc.age} ans</span>` : ''}
            </div>
            ${enc.specialite ? `<div class="enc-spec"><i class="fas fa-star"></i> ${enc.specialite}</div>` : ''}
            <div class="enc-contact">
              ${enc.telephone ? `<div><i class="fas fa-phone"></i> ${enc.telephone}</div>` : ''}
              ${enc.email     ? `<div><i class="fas fa-envelope"></i> ${enc.email}</div>`  : ''}
            </div>
          </div>
          <div class="enc-card-foot">
            <div class="enc-stats">
              <div class="enc-stat"><span class="enc-stat-n">${enc.nb_groupes}</span><span class="enc-stat-l">Groupe${enc.nb_groupes !== 1 ? 's' : ''}</span></div>
              <div class="enc-stat-sep"></div>
              <div class="enc-stat"><span class="enc-stat-n">${enc.nb_enfants}</span><span class="enc-stat-l">Enfant${enc.nb_enfants !== 1 ? 's' : ''}</span></div>
            </div>
            <button class="enc-btn-groupes" onclick="showGroupesEncadrant(${enc.id},'${(enc.nom||'').replace(/'/g,"\\'")}')">
              <i class="fas fa-users"></i> Voir groupes
            </button>
          </div>
        </div>`;
    });
  } catch {
    if (grid) grid.innerHTML = `<div class="empty-state"><i class="fas fa-triangle-exclamation"></i><p>Erreur chargement</p></div>`;
  }
};

// ── Ajouter / Modifier encadrant ──────────────────────────
window.openAddEncadrant = function () {
  document.getElementById("enc-id").value = "";
  ["enc-nom","enc-age","enc-specialite","enc-telephone","enc-email"].forEach(id => {
    document.getElementById(id).value = "";
  });
  document.getElementById("enc-sexe").value = "Homme";
  document.querySelector('#modal-addEncadrant .modal-title').innerHTML =
    '<i class="fas fa-person-chalkboard"></i> Nouvel Encadrant';
  document.querySelector('#modal-addEncadrant .btn-primary').innerHTML =
    '<i class="fas fa-save"></i> Enregistrer';
  openModal("addEncadrant");
};

window.openEditEncadrant = function (id, nom, sexe, age, specialite, telephone, email) {
  document.getElementById("enc-id").value          = id;
  document.getElementById("enc-nom").value         = nom;
  document.getElementById("enc-sexe").value        = sexe || "Homme";
  document.getElementById("enc-age").value         = age || "";
  document.getElementById("enc-specialite").value  = specialite || "";
  document.getElementById("enc-telephone").value   = telephone || "";
  document.getElementById("enc-email").value       = email || "";
  document.querySelector('#modal-addEncadrant .modal-title').innerHTML =
    '<i class="fas fa-pen"></i> Modifier Encadrant';
  document.querySelector('#modal-addEncadrant .btn-primary').innerHTML =
    '<i class="fas fa-save"></i> Enregistrer';
  openModal("addEncadrant");
};

window.submitAddEncadrant = async function () {
  const id = document.getElementById("enc-id").value;
  const payload = {
    nom:        document.getElementById("enc-nom").value.trim(),
    sexe:       document.getElementById("enc-sexe").value,
    age:        document.getElementById("enc-age").value || null,
    specialite: document.getElementById("enc-specialite").value,
    telephone:  document.getElementById("enc-telephone").value,
    email:      document.getElementById("enc-email").value
  };
  if (!payload.nom) return showToast("Nom requis");
  try {
    if (id) {
      await apiFetch("/encadrants/" + id, "PUT", payload);
      showToast("Encadrant modifié");
    } else {
      await apiFetch("/encadrants", "POST", payload);
      showToast("Encadrant ajouté");
    }
    document.getElementById("enc-id").value = "";
    closeModal("addEncadrant");
    loadEncadrants();
  } catch {
    showToast("Erreur enregistrement");
  }
};

window.deleteEncadrant = async function (id) {
  confirmDel("cet encadrant", async () => {
    await apiFetch("/encadrants/" + id, "DELETE");
    showToast("Encadrant supprimé");
    loadEncadrants();
  });
};

// ── Groupes supervisés ────────────────────────────────────
window.showGroupesEncadrant = async function (encId, encNom) {
  const body  = document.getElementById("groupesEncadrantBody");
  const title = document.querySelector('#modal-groupesEncadrant .modal-title span');
  if (title) title.textContent = encNom;
  body.innerHTML = `<p style="color:var(--ink4);text-align:center;padding:28px">Chargement…</p>`;
  openModal("groupesEncadrant");

  try {
    const data   = await apiFetch(`/encadrants/${encId}/groupes`);
    const groupes = data.results || data;

    if (!groupes.length) {
      body.innerHTML = `<div class="empty-state"><i class="fas fa-users-slash"></i><p>Cet encadrant ne supervise aucun groupe</p></div>`;
      return;
    }

    body.innerHTML = groupes.map(g => {
      const genreIco  = g.genre === 'fille' ? '♀' : g.genre === 'garcon' ? '♂' : '⊕';
      const gchCls    = g.genre === 'fille' ? 'gch-pink' : g.genre === 'garcon' ? 'gch-blue' : 'gch-green';
      const membres   = (g.membres || []).map(m => {
        const ini = (m.nom||'?').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
        const bg  = (m.genre||'').toLowerCase().includes('fil') ? 'var(--pink)' : 'var(--blue)';
        return `<div class="membre-card">
          <div class="membre-av" style="background:${bg}">${ini}</div>
          <div class="membre-info">
            <div class="membre-nom">${m.nom}</div>
            <div class="membre-age">${m.age} ans</div>
          </div>
        </div>`;
      }).join('');

      const vide = !g.membres || !g.membres.length
        ? `<div class="groupe-empty">Aucun enfant dans ce groupe</div>` : '';

      return `
        <div class="groupe-card" style="margin-bottom:16px">
          <div class="groupe-card-head ${gchCls}">
            <div class="gch-left">
              <span class="gch-ico">${genreIco}</span>
              <div>
                <div class="gch-nom">${g.groupe_nom} · ${g.age_min}–${g.age_max} ans</div>
                <div class="gch-enc" style="color:var(--ink3)"><i class="fas fa-campground"></i> ${g.camp_nom} — ${g.camp_ville}</div>
              </div>
            </div>
            <span class="gch-cap">${g.nb_membres} / ${g.capacite}</span>
          </div>
          <div class="groupe-membres">${membres}${vide}</div>
        </div>`;
    }).join('');
  } catch {
    body.innerHTML = `<p style="color:var(--red);text-align:center;padding:20px">Erreur chargement</p>`;
  }
};

// ── Charger encadrants dans un select ─────────────────────
window.loadEncadrantsSelect = async function (selectId, selectedId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = `<option value="">— Aucun encadrant —</option>`;
  try {
    const data = await apiFetch("/encadrants");
    const list = data.results || data;
    list.forEach(e => {
      const opt = document.createElement("option");
      opt.value = e.id;
      opt.textContent = `${e.nom}${e.specialite ? ' · ' + e.specialite : ''}`;
      if (selectedId && e.id == selectedId) opt.selected = true;
      sel.appendChild(opt);
    });
  } catch { /* silently ignore */ }
};
