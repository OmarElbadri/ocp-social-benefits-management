window.loadUsers = async function () {
  const container = document.getElementById("usersContainer");
  const countEl   = document.getElementById("users-count");

  try {
    const res   = await apiFetch("/auth/users");
    const users = res.results || res;

    const admins = users.filter(u => u.role === 'admin');
    const agents = users.filter(u => u.role !== 'admin');

    if (countEl)
      countEl.textContent = `${users.length} utilisateur${users.length !== 1 ? 's' : ''} — ${admins.length} admin${admins.length !== 1 ? 's' : ''}, ${agents.length} agent${agents.length !== 1 ? 's' : ''}`;

    if (!container) return;
    container.innerHTML = "";


    const currentId   = parseInt(localStorage.getItem("user_id")) || 0;
    const currentRole = localStorage.getItem("user_role") || "agent";

    // Agents voient uniquement leur propre compte
    const visibleUsers = currentRole === 'admin'
      ? [...admins, ...agents]
      : users.filter(u => u.id === currentId);

    if (!visibleUsers.length) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-user-slash"></i><p>Aucun utilisateur trouvé</p></div>`;
      return;
    }

    // Admins en premier, puis agents
    visibleUsers.forEach(u => {
      const isAdminCard = u.role === 'admin';
      const ini         = (u.nom || u.email || '?')[0].toUpperCase();
      const roleLabel   = isAdminCard ? 'Administrateur' : 'Agent Social';
      const ico         = isAdminCard ? 'fa-shield-halved' : 'fa-user-tie';
      const cardCls     = isAdminCard ? 'uc-admin' : 'uc-agent';
      const avatarCls   = isAdminCard ? 'uca-admin' : 'uca-agent';

      // Permissions : admin peut tout, agent seulement soi-même
      const canAct = currentRole === 'admin' || u.id === currentId;
      const isSelf = u.id === currentId;

      const actionBtns = canAct ? `
        <div class="uc-actions">
          <button class="uc-edit-btn" onclick="openEditUser(${u.id},'${(u.nom||'').replace(/'/g,"\\'")}','${u.email}','${u.role}')">
            <i class="fas fa-pen"></i> Modifier
          </button>
          <button class="uc-del-btn" onclick="deleteUser(${u.id})${isSelf ? '' : ''}">
            <i class="fas fa-trash"></i>
          </button>
        </div>` : '';

      container.innerHTML += `
        <div class="user-card ${cardCls}">
          <div class="uc-banner">
            <div class="uc-role-ico"><i class="fas ${ico}"></i></div>
            ${isSelf ? '<div class="uc-self-tag"><i class="fas fa-circle-check"></i> Moi</div>' : ''}
          </div>
          <div class="uc-av-wrap">
            <div class="uc-av ${avatarCls}">${ini}</div>
          </div>
          <div class="uc-body">
            <div class="uc-nom">${u.nom || '—'}</div>
            <div class="uc-email"><i class="fas fa-envelope"></i> ${u.email}</div>
            <span class="uc-badge ${isAdminCard ? 'ucb-admin' : 'ucb-agent'}">
              <i class="fas ${ico}"></i> ${roleLabel}
            </span>
          </div>
          <div class="uc-foot">${actionBtns}</div>
        </div>`;
    });

  } catch {
    if (container)
      container.innerHTML = `<div class="empty-state"><i class="fas fa-triangle-exclamation"></i><p>Erreur chargement utilisateurs</p></div>`;
  }
};

// ── Ouvrir modal édition ──────────────────────────────────
window.openEditUser = function (id, nom, email, role) {
  document.getElementById("edit-usr-id").value    = id;
  document.getElementById("edit-usr-nom").value   = nom;
  document.getElementById("edit-usr-email").value = email;
  document.getElementById("edit-usr-pwd").value   = "";

  // Rôle : modifiable seulement par admin, et pas sur son propre compte
  const roleWrap    = document.getElementById("edit-usr-role-wrap");
  const roleDisplay = document.getElementById("edit-usr-role-display");
  const roleSelect  = document.getElementById("edit-usr-role");
  const currentId   = parseInt(localStorage.getItem("user_id")) || 0;
  const currentRole = localStorage.getItem("user_role") || "agent";

  const canChangeRole = currentRole === 'admin' && id !== currentId;
  if (roleWrap) roleWrap.style.display = canChangeRole ? "" : "none";
  if (roleDisplay) roleDisplay.style.display = canChangeRole ? "none" : "";
  if (roleSelect) roleSelect.value = role;
  if (roleDisplay) roleDisplay.textContent = role === 'admin' ? 'Administrateur' : 'Agent Social';

  openModal("editUser");
};

// ── Soumettre modification ────────────────────────────────
window.submitEditUser = async function () {
  const id      = document.getElementById("edit-usr-id").value;
  const nom     = document.getElementById("edit-usr-nom").value.trim();
  const email   = document.getElementById("edit-usr-email").value.trim();
  const pwd     = document.getElementById("edit-usr-pwd").value;
  const currentRole = localStorage.getItem("user_role") || "agent";
  const currentId   = parseInt(localStorage.getItem("user_id")) || 0;

  const roleWrap = document.getElementById("edit-usr-role-wrap");
  let role = document.getElementById("edit-usr-role").value;
  if (!roleWrap || roleWrap.style.display === "none") {
    // agent modifie son propre profil → garder son rôle actuel
    role = currentRole;
  }

  if (!nom || !email) return showToast("Nom et email requis");

  const payload = { nom, email, role };
  if (pwd) payload.password = pwd;

  try {
    await apiFetch("/auth/" + id, "PUT", payload);

    // Mettre à jour les infos dans la sidebar si c'est l'utilisateur courant
    if (parseInt(id) === currentId) {
      localStorage.setItem("user_nom", nom);
      const sbName = document.getElementById("sbUserName");
      const sbAv   = document.getElementById("sbUserAv");
      if (sbName) sbName.textContent = nom;
      if (sbAv)   sbAv.textContent   = nom.charAt(0).toUpperCase();
    }

    showToast("Utilisateur modifié");
    closeModal("editUser");
    loadUsers();
  } catch {
    showToast("Erreur modification");
  }
};

// ── Ajouter un utilisateur ────────────────────────────────
window.submitAddUser = async function () {
  const payload = {
    nom:      document.getElementById("usr-nom").value.trim(),
    email:    document.getElementById("usr-email").value.trim(),
    password: document.getElementById("usr-password").value,
    role:     document.getElementById("usr-role").value
  };
  if (!payload.nom || !payload.email || !payload.password)
    return showToast("Champs requis");
  try {
    await apiFetch("/auth/register", "POST", payload);
    closeModal("addUser");
    showToast("Utilisateur ajouté");
    loadUsers();
  } catch {
    showToast("Erreur création");
  }
};

// ── Supprimer un utilisateur ──────────────────────────────
window.deleteUser = function (id) {
  const currentId = parseInt(localStorage.getItem("user_id")) || 0;
  const isSelf    = parseInt(id) === currentId;
  const label     = isSelf ? "votre propre compte (vous serez déconnecté)" : "cet utilisateur";

  confirmDel(label, async () => {
    try {
      await apiFetch("/auth/" + id, "DELETE");
      if (isSelf) {
        showToast("Compte supprimé — déconnexion…");
        setTimeout(() => doLogout(), 1500);
      } else {
        showToast("Supprimé");
        loadUsers();
      }
    } catch {
      showToast("Erreur suppression");
    }
  });
};
