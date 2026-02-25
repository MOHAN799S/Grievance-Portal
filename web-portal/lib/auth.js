const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ── Token helpers ──────────────────────────────────────────────────────────

export const getToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("token") : null;

export const getRefreshToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null;

export const saveTokens = (token, refreshToken) => {
  localStorage.setItem("token",        token);
  localStorage.setItem("refreshToken", refreshToken);
};

export const clearTokens = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("citizen_user");
};

// ── Authenticated fetch wrapper ────────────────────────────────────────────
// Automatically attaches Bearer token; retries once with refresh if 401

export async function authFetch(url, options = {}) {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  // Token expired → try refresh once
  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      const newToken = getToken();
      return fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
          Authorization: `Bearer ${newToken}`,
        },
      });
    }
    // Refresh also failed — force logout
    clearTokens();
    window.location.href = "/login";
  }

  return res;
}

// ── Refresh access token ───────────────────────────────────────────────────

async function tryRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API}/api/auth/refresh`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ refreshToken }),
    });
    const json = await res.json();
    if (json.success && json.token) {
      localStorage.setItem("token", json.token);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ── Login ──────────────────────────────────────────────────────────────────

export async function login(email, password) {
  const res  = await fetch(`${API}/api/auth/login`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ email, password }),
  });
  const json = await res.json();

  if (json.success) {
    saveTokens(json.token, json.refreshToken);
    // Cache lightweight user object for instant reads
    localStorage.setItem("citizen_user", JSON.stringify({
      name:  json.user.fullName,
      email: json.user.email,
      role:  json.role,
    }));
  }

  return json; // { success, token, refreshToken, user, role } | { success:false, message }
}

// ── Logout ─────────────────────────────────────────────────────────────────

export async function logout() {
  try {
    await authFetch(`${API}/api/auth/logout`, { method: "POST" });
  } catch { /* ignore */ }
  clearTokens();
}

// ── Check sign-in status ───────────────────────────────────────────────────
// Returns { isSignedIn, role, user } or { isSignedIn: false }

export async function checkAuth() {
  const token = getToken();
  if (!token) return { isSignedIn: false };

  try {
    const res  = await authFetch(`${API}/api/auth/check`);
    const json = await res.json();
    return json.success
      ? { isSignedIn: true, role: json.role, user: json.user }
      : { isSignedIn: false };
  } catch {
    return { isSignedIn: false };
  }
}