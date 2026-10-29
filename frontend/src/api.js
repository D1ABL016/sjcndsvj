const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export async function fetchJson(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}
