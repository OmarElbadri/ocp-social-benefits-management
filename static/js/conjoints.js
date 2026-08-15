let _matLookupTimer = null;
window.lookupEmployeByMatricule = function () {
  clearTimeout(_matLookupTimer);
  const val = (document.getElementById("cj-matricule").value || "").trim();
  const info = document.getElementById("cj-employe-info");
  if (!val) { info.innerHTML = ""; return; }
  info.innerHTML = `<span style="color:var(--ink4)"><i class="fas fa-spinner fa-spin"></i> Recherche…</span>`;
  _matLookupTimer = setTimeout(async () => {
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

window.loadConjoints = async function () {
  const data = await apiFetch("/conjoints");
  const list = data.results || data;

  const badge = document.getElementById("nb-conjoints");
  if (badge) badge.textContent = list.length;
  const count = document.getElementById("conjoints-count");
  if (count) count.textContent = `${list.length} conjoint${list.length !== 1 ? 's' : ''} enregistré${list.length !== 1 ? 's' : ''}`;

  const table = document.getElementById("conjointsTable");
  table.innerHTML = "";

  if (!list.length) {
    table.innerHTML = `<tr><td colspan="5" class="tbl-empty"><i class="fas fa-people-arrows"></i><span>Aucun conjoint enregistré</span></td></tr>`;
    return;
  }

  list.forEach(e => {
    const ini     = (e.nom || '?')[0].toUpperCase();
    const isFemme = (e.sexe || '').toLowerCase() === 'femme';
    const avBg    = isFemme ? 'var(--pink)' : 'var(--blue)';
    const sexeIco = isFemme ? 'fa-venus' : 'fa-mars';
    const sexeCls = isFemme ? 'badge b-pink' : 'badge b-blue';
    const sexeLbl = isFemme ? 'Femme' : 'Homme';

    table.innerHTML += `
      <tr>
        <td>
          <div class="av-cell">
            <div class="av" style="background:${avBg}">${ini}</div>
            <div class="av-name">${e.nom}</div>
          </div>
        </td>
        <td><span class="${sexeCls}"><i class="fas ${sexeIco}"></i> ${sexeLbl}</span></td>
        <td class="td-light">${e.employe_nom || '—'}</td>
        <td class="td-light">${e.email || '—'}</td>
        <td>
          <div class="act-btns">
            <button class="act-btn e" title="Modifier" onclick="openEditConjoint(${e.id},'${(e.nom||'').replace(/'/g,"\\'")}','${e.sexe||'Femme'}','${(e.email||'').replace(/'/g,"\\'")}','${(e.employe_matricule||'').replace(/'/g,"\\'")}','${(e.employe_nom||'').replace(/'/g,"\\'")}')"><i class="fas fa-pen"></i></button>
            <button class="act-btn d" title="Supprimer" onclick="deleteConjoint(${e.id})"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
  });
};

window.submitAddConjoint = async function () {
  const id = document.getElementById("cj-id").value;
  const payload = {
    nom:       document.getElementById("cj-nom").value.trim(),
    sexe:      document.getElementById("cj-sexe").value,
    email:     document.getElementById("cj-email").value,
    matricule: (document.getElementById("cj-matricule").value || "").trim()
  };
  if (!payload.nom) return showToast("Nom requis", true);
  if (!payload.matricule) return showToast("Matricule employé requis", true);

  try {
    if (id) {
      await apiFetch("/conjoints/" + id, "PUT", payload);
      showToast("Conjoint(e) modifié(e)");
    } else {
      await apiFetch("/conjoints", "POST", payload);
      showToast("Conjoint(e) ajouté(e)");
    }
    document.getElementById("cj-id").value = "";
    closeModal("addConjoint");
    loadConjoints();
    loadDashboard();
  } catch (err) {
    showToast(err.message, true);
  }
};

window.openAddConjoint = function () {
  document.getElementById("cj-id").value = "";
  ["cj-nom","cj-email","cj-matricule"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("cj-sexe").value = "Femme";
  document.getElementById("cj-employe-info").innerHTML = "";
  document.querySelector('#modal-addConjoint .modal-title').innerHTML =
    '<i class="fas fa-people-arrows"></i> Ajouter un(e) Conjoint(e)';
  document.querySelector('#modal-addConjoint .btn-primary').innerHTML =
    '<i class="fas fa-save"></i> Enregistrer';
  openModal("addConjoint");
};

window.openEditConjoint = function (id, nom, sexe, email, matricule, empNom) {
  document.getElementById("cj-id").value        = id;
  document.getElementById("cj-nom").value       = nom;
  document.getElementById("cj-sexe").value      = sexe || "Femme";
  document.getElementById("cj-email").value     = email || "";
  document.getElementById("cj-matricule").value = matricule || "";
  const info = document.getElementById("cj-employe-info");
  info.innerHTML = matricule && empNom
    ? `<span style="color:var(--g500)"><i class="fas fa-circle-check"></i> ${empNom}</span>`
    : "";
  document.querySelector('#modal-addConjoint .modal-title').innerHTML =
    '<i class="fas fa-pen"></i> Modifier Conjoint(e)';
  document.querySelector('#modal-addConjoint .btn-primary').innerHTML =
    '<i class="fas fa-save"></i> Enregistrer';
  openModal("addConjoint");
};

window.deleteConjoint = async function (id) {
  confirmDel("ce conjoint", async () => {
    await apiFetch("/conjoints/" + id, "DELETE");
    showToast("Conjoint supprimé");
    loadConjoints();
    loadDashboard();
  });
};

// Alias pour compatibilité si appelé ailleurs
window.loadEpouses = window.loadConjoints;
