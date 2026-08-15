window.apiFetch = async function(endpoint, method = "GET", data = null) {

  const API_URL = window.API_URL || "/api";

  // ðŸ”¥ nettoie endpoint
  endpoint = "/" + endpoint.replace(/^\/+|\/+$/g, "");

  const token = localStorage.getItem("token");

  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  // bust browser GET cache on every request
  const url = method === "GET"
    ? API_URL + endpoint + (endpoint.includes("?") ? "&" : "?") + "_t=" + Date.now()
    : API_URL + endpoint;

  const res = await fetch(url, options);

  if (!res.ok) {
    let msg = "Erreur API";
    try {
      const body = await res.json();
      if (body.error) msg = body.error;
    } catch {}
    throw new Error(msg);
  }

  return res.status === 204 ? null : res.json();
};
