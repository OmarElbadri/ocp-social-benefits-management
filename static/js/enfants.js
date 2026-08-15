let _enMatTimer = null;
window.lookupEmployeEnfant = function () {
  clearTimeout(_enMatTimer);
  const val = (document.getElementById("en-matricule").value || "").trim();
  const info = document.getElementById("en-employe-info");
  if (!val) { info.innerHTML = ""; return; }
  info.innerHTML = `<span style="color:var(--ink4)"><i class="fas fa-spinner fa-spin"></i> Recherche…</span>`;
  _enMatTimer = setTimeout(async () => {
    try {
      const list = await apiFetch("/employes");
      const emp = (list.results || list).find(e => (e.matricule||"").toUpperCase() === val.toUpperCase());
      if (emp) {
        info.innerHTML = `<span style="color:var(--g500)"><i class="fas fa-circle-check"></i> ${emp.nom}</span>`;
      } else {
        info.innerHTML = `<span style="color:var(--red)"><i class="fas fa-circle-xmark"></i> Matricule introuvable</span>`;
      }
    } catch { info.innerHTML = ""; }
  }, 400);
};

window.loadEnfants = async function () {
  const data = await apiFetch("/enfants");
  const list = data.results || data;

  const badge = document.getElementById("nb-enfants");
  if (badge) badge.textContent = list.length;
  const count = document.getElementById("enfants-count");
  if (count) count.textContent = `${list.length} enfant${list.length !== 1 ? 's' : ''} enregistré${list.length !== 1 ? 's' : ''}`;

  const table = document.getElementById("enfantsTable");
  table.innerHTML = "";

  if (!list.length) {
    table.innerHTML = `<tr><td colspan="5" class="tbl-empty"><i class="fas fa-child"></i><span>Aucun enfant enregistré</span></td></tr>`;
    return;
  }

  list.forEach(e => {
    const isFille  = (e.genre||'').toLowerCase().includes('fil');
    const avColor  = isFille ? 'var(--pink)' : 'var(--blue)';
    const badgeCls = isFille ? 'b-pink' : 'b-blue';
    const ini = (e.nom || '?')[0].toUpperCase();
    table.innerHTML += `
      <tr>
        <td>
          <div class="av-cell">
            <div class="av" style="background:${avColor}">${ini}</div>
            <div class="av-name">${e.nom}</div>
          </div>
        </td>
        <td><span class="badge b-gold"><i class="fas fa-birthday-cake"></i> ${e.age} ans</span></td>
        <td><span class="badge ${badgeCls}">${e.genre || '—'}</span></td>
        <td class="td-light">${e.employe_nom || '—'}</td>
        <td>
          <div class="act-btns">
            <button class="act-btn e" title="Modifier" onclick="editEnfant(${e.id},'${(e.nom||'').replace(/'/g,"\\'")}',${e.age},'${e.genre||''}','${(e.employe_matricule||'').replace(/'/g,"\\'")}','${(e.employe_nom||'').replace(/'/g,"\\'")}')"><i class="fas fa-pen"></i></button>
            <button class="act-btn d" title="Supprimer" onclick="deleteEnfant(${e.id})"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
  });
};

window.openAddEnfant = function () {
  document.getElementById("en-id").value = "";
  ["en-nom","en-age","en-matricule"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("en-employe-info").innerHTML = "";
  document.querySelector('#modal-addEnfant .modal-title').innerHTML = '<i class="fas fa-child"></i> Ajouter un Enfant';
  document.querySelector('#modal-addEnfant .btn-primary').innerHTML = '<i class="fas fa-save"></i> Enregistrer';
  openModal("addEnfant");
};

window.submitAddEnfant = async function () {
  const id = document.getElementById("en-id").value;
  const payload = {
    nom:       document.getElementById("en-nom").value,
    age:       document.getElementById("en-age").value,
    genre:     document.getElementById("en-genre").value,
    matricule: (document.getElementById("en-matricule").value || "").trim()
  };

  if (!payload.nom) return showToast("Nom requis", true);
  if (!payload.age) return showToast("Âge requis", true);
  if (!payload.matricule) return showToast("Matricule employé (parent) requis", true);

  try {
    if (id) {
      await apiFetch("/enfants/" + id, "PUT", payload);
      showToast("Enfant modifié");
    } else {
      await apiFetch("/enfants", "POST", payload);
      showToast("Enfant ajouté");
    }
    document.getElementById("en-id").value = "";
    closeModal("addEnfant");
    loadEnfants();
    loadDashboard();
  } catch (err) {
    showToast(err.message, true);
  }
};

window.deleteEnfant = async id => {
  await apiFetch("/enfants/" + id, "DELETE");
  loadEnfants();
  loadDashboard();
};

window.editEnfant = function(id, nom, age, genre, matricule, empNom) {
  document.getElementById("en-id").value        = id;
  document.getElementById("en-nom").value       = nom;
  document.getElementById("en-age").value       = age;
  document.getElementById("en-genre").value     = genre;
  document.getElementById("en-matricule").value = matricule || "";
  const info = document.getElementById("en-employe-info");
  info.innerHTML = matricule && empNom
    ? `<span style="color:var(--g500)"><i class="fas fa-circle-check"></i> ${empNom}</span>`
    : "";
  document.querySelector('#modal-addEnfant .modal-title').innerHTML = '<i class="fas fa-pen"></i> Modifier un Enfant';
  document.querySelector('#modal-addEnfant .btn-primary').innerHTML = '<i class="fas fa-save"></i> Modifier';
  openModal("addEnfant");
};
