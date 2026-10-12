export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

let token = '';

export function setToken(t) {
  token = t || '';
}

export function getToken() {
  return token;
}

export async function api(path, opts = {}) {
  const headers = new Headers(opts.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let body = opts.body;
  if (body && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...opts, headers, body });
  } catch {
    throw new Error(`Can't reach the backend at ${API_BASE}. Start it with npm run dev in the backend folder.`);
  }

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.error || `Backend request failed (${res.status})`);
  }

  // 204 has no body, json() would throw
  return res.status === 204 ? null : res.json();
}
