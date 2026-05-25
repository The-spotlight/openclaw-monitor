const TIMEOUT = 8000;

async function safeFetch(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchStatus() {
  return safeFetch('/api/status');
}

export async function fetchMetrics() {
  return safeFetch('/api/metrics');
}

export async function fetchSessions() {
  return safeFetch('/api/sessions');
}

export async function fetchLogs(level = 'all') {
  const url = level && level !== 'all'
    ? `/api/logs?level=${encodeURIComponent(level)}&limit=50`
    : '/api/logs?limit=50';
  return safeFetch(url);
}
