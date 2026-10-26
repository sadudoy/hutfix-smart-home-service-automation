window.API = {
  async request(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    const body = opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData) ? JSON.stringify(opts.body) : opts.body;
    // Handle FormData (don't set Content-Type header)
    if (body instanceof FormData) delete headers['Content-Type'];
    
    const res = await fetch(path, { credentials: 'include', method: opts.method || 'GET', headers, body });
    let data = null;
    try { data = await res.json(); } catch {}
    if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
    return data;
  },
  get(p) { return this.request(p); },
  post(p, body) { return this.request(p, { method: 'POST', body }); },
  patch(p, body) { return this.request(p, { method: 'PATCH', body }); }
};
