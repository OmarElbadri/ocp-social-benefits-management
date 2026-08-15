function _empColor(name) {
  const c = ['#2a8a52','#1a6fa8','#5b21b6','#be185d','#c8943f','#d4720a'];
  let h = 0;
  for (let i = 0; i < (name||'').length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffff;
  return c[Math.abs(h) % c.length];
}

window.loadEmployes = async function () {
  const data = await apiFetch("/employes");
  const list = data.results || data;

  const badge = document.getElementById("nb-employes");
  if (badge) badge.textContent = list.length;
  const count = document.getElementById("employes-count");
  if (count) count.textContent = `${list.length} employé${list.length !== 1 ? 's' : ''} enregistré${list.length !== 1 ? 's' : ''}`;

  const table = document.getElementById("employesTable");
  table.innerHTML = "";

  if (!list.length) {
    table.innerHTML = `<tr><td colspan="6" class="tbl-empty"><i class="fas fa-user-slash"></i><span>Aucun employé enregistré</span></td></tr>`;
    return;
  }

  list.forEach(e => {
    const ini = (e.nom || '?')[0].toUpperCase();
    const col = _empColor(e.nom);
    table.innerHTML += `
      <tr>
        <td>
          <div class="av-cell">
            <div class="av" style="background:${col}">${ini}</div>
            <div>
              <div class="av-name">${e.nom}</div>
              <div class="av-sub">${e.matricule || '—'}</div>
            </div>
          </div>
        </td>
        <td class="td-light">${e.email || '—'}</td>
        <td><span class="badge b-slate">${e.poste || '—'}</span></td>
        <td><span class="${(e.sexe||'').toLowerCase()==='femme'?'badge b-pink':'badge b-blue'}"><i class="fas ${(e.sexe||'').toLowerCase()==='femme'?'fa-venus':'fa-mars'}"></i> ${e.sexe||'—'}</span></td>
        <td><span class="badge b-slate"><i class="fas fa-people-arrows"></i> ${e.nb_epouses}</span></td>
        <td><span class="badge b-gold"><i class="fas fa-child"></i> ${e.nb_enfants}</span></td>
        <td>
          <div class="act-btns">
            <button class="act-btn e" title="Modifier" onclick="editEmploye(${e.id},'${(e.nom||'').replace(/'/g,"\\'")}','${(e.email||'').replace(/'/g,"\\'")}','${(e.matricule||'').replace(/'/g,"\\'")}','${(e.poste||'').replace(/'/g,"\\'")}','${e.sexe||'Homme'}')"><i class="fas fa-pen"></i></button>
            <button class="act-btn d" title="Supprimer" onclick="deleteEmploye(${e.id})"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
  });
};

window.openAddEmploye = async function () {
  document.getElementById("emp-id").value = "";
  ["emp-nom","emp-email","emp-matricule","emp-poste"].forEach(id => {
    document.getElementById(id).value = "";
  });
  document.getElementById("emp-sexe").value = "Homme";
  document.querySelector('#modal-addEmploye .modal-title').innerHTML = '<i class="fas fa-user-plus"></i> Ajouter un Employé';
  document.querySelector('#modal-addEmploye .btn-primary').innerHTML = '<i class="fas fa-save"></i> Enregistrer';

  // auto-generate matricule
  const matInput = document.getElementById("emp-matricule");
  matInput.readOnly = true;
  matInput.style.background = "var(--g50)";
  matInput.style.color = "var(--ink3)";
  matInput.value = "Génération…";
  try {
    const res = await apiFetch("/employes/next-matricule");
    matInput.value = res.matricule;
  } catch {
    matInput.value = "";
    matInput.readOnly = false;
    matInput.style.background = "";
    matInput.style.color = "";
  }

  document.getElementById("mat-auto-badge").style.display = "inline-flex";
  openModal("addEmploye");
};

window.submitAddEmploye = async function () {
  const id = document.getElementById("emp-id").value;
  const payload = {
    nom:       document.getElementById("emp-nom").value,
    email:     document.getElementById("emp-email").value,
    matricule: document.getElementById("emp-matricule").value,
    poste:     document.getElementById("emp-poste").value,
    sexe:      document.getElementById("emp-sexe").value
  };

  if (id) {
    await apiFetch("/employes/" + id, "PUT", payload);
    showToast("Employé modifié");
  } else {
    await apiFetch("/employes", "POST", payload);
    showToast("Employé ajouté");
  }

  document.getElementById("emp-id").value = "";
  closeModal("addEmploye");
  loadEmployes();
  loadDashboard();
};

window.deleteEmploye = async id => {
  await apiFetch("/employes/" + id, "DELETE");
  loadEmployes();
  loadDashboard();
};

window.editEmploye = function(id, nom, email, matricule, poste, sexe) {
  document.getElementById("emp-id").value = id;
  document.getElementById("emp-nom").value = nom;
  document.getElementById("emp-email").value = email;
  document.getElementById("emp-poste").value = poste;
  document.getElementById("emp-sexe").value = sexe || "Homme";

  // matricule editable in edit mode
  const matInput = document.getElementById("emp-matricule");
  matInput.value = matricule;
  matInput.readOnly = false;
  matInput.style.background = "";
  matInput.style.color = "";
  document.getElementById("mat-auto-badge").style.display = "none";

  document.querySelector('#modal-addEmploye .modal-title').innerHTML = '<i class="fas fa-pen"></i> Modifier un Employé';
  document.querySelector('#modal-addEmploye .btn-primary').innerHTML = '<i class="fas fa-save"></i> Modifier';
  openModal("addEmploye");
};
