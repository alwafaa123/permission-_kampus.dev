const Utils = {
  setToken(token) {
    localStorage.setItem("token", token);
  },
  getToken() {
    return localStorage.getItem("token");
  },
  setUser(user) {
    localStorage.setItem("user", JSON.stringify(user));
  },
  getUser() {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  },
  getAuthHeaders(extra = {}) {
    const token = this.getToken();
    return {
      ...extra,
      Authorization: token ? `Bearer ${token}` : "",
    };
  },
  ensureAuthenticated() {
    if (!this.getToken() || !this.getUser()) {
      this.logout();
      return false;
    }
    return true;
  },
  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/pages/auth/login.html";
  },
};
