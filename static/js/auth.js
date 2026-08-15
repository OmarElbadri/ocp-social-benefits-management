window.handleLogin = async function () {
  var email    = document.getElementById("loginEmail").value.trim();
  var password = document.getElementById("loginPwd").value;
  var errEl    = document.getElementById("loginErr");
  if (errEl) errEl.classList.remove("show");

  try {
    var res  = await fetch((window.API_URL || "/api") + "/auth/login", {
      method : "POST",
      headers: { "Content-Type": "application/json" },
      body   : JSON.stringify({ email: email, password: password })
    });

    var data = await res.json();

    if (data.access_token) {
      localStorage.setItem("token",     data.access_token);
      localStorage.setItem("user_nom",  (data.user && data.user.nom)  || "Utilisateur");
      localStorage.setItem("user_role", (data.user && data.user.role) || "agent");
      localStorage.setItem("user_id",   (data.user && data.user.id)   || "");

      document.getElementById("loginScreen").style.display = "none";
      document.getElementById("appShell").style.display    = "block";

      var nom      = localStorage.getItem("user_nom")  || "Utilisateur";
      var role     = localStorage.getItem("user_role") || "agent";
      var roleLbl  = role === "admin" ? "Administrateur" : "Agent Social";
      var initiale = nom.charAt(0).toUpperCase();

      document.body.setAttribute("data-role", role);

      var sbAv   = document.getElementById("sbUserAv");
      var sbName = document.getElementById("sbUserName");
      var sbRole = document.getElementById("sbUserRole");
      if (sbAv)   sbAv.textContent   = initiale;
      if (sbName) sbName.textContent = nom;
      if (sbRole) sbRole.textContent = roleLbl;

      var tbName = document.getElementById("topbarName");
      var tbRole = document.getElementById("topbarRole");
      var tbAv   = document.getElementById("topbarAv");
      if (tbName) tbName.textContent = nom;
      if (tbRole) tbRole.textContent = roleLbl;
      if (tbAv)   tbAv.textContent   = initiale;

      updateApiStatus(true);

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
      } catch (err) {
        console.error("Erreur chargement donnees :", err);
        updateApiStatus(false);
      }

      showToast("Connexion reussie");

    } else {
      if (errEl) errEl.classList.add("show");
    }

  } catch (e) {
    if (errEl) errEl.classList.add("show");
    updateApiStatus(false);
  }
};

// Connexion avec la touche Entree
window.addEventListener("load", function () {
  ["loginEmail", "loginPwd"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter") window.handleLogin();
      });
    }
  });
});
