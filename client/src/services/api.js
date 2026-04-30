/**
 * API Service — Centralised HTTP client for the backend.
 * All methods return parsed JSON from the { success, data, error } envelope.
 */

const BASE = '/api';

async function request(url, options = {}) {
  try {
    const res = await fetch(`${BASE}${url}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Unknown error');
    return json.data;
  } catch (err) {
    console.error(`API ${options.method || 'GET'} ${url}:`, err);
    throw err;
  }
}

const API = {
  // Cities
  getCities: () => request('/cities'),
  addCity: (body) => request('/city', { method: 'POST', body: JSON.stringify(body) }),
  updateCity: (id, body) => request(`/city/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCity: (id) => request(`/city/${id}`, { method: 'DELETE' }),

  // Roads
  getRoads: () => request('/roads'),
  addRoad: (body) => request('/road', { method: 'POST', body: JSON.stringify(body) }),
  deleteRoad: (id) => request(`/road/${id}`, { method: 'DELETE' }),

  // Graph
  getGraph: () => request('/graph'),

  // Route
  computeRoute: (body) => request('/route', { method: 'POST', body: JSON.stringify(body) }),

  // Traffic
  updateTraffic: (body) => request('/traffic', { method: 'PUT', body: JSON.stringify(body) }),

  // Analytics
  getAnalytics: () => request('/analytics'),

  // Compare
  compareAlgorithms: (body) => request('/compare', { method: 'POST', body: JSON.stringify(body) }),

  // Map & Real distances
  getRealDistance: (body) => request('/real-distance', { method: 'POST', body: JSON.stringify(body) }),
  syncDistances: () => request('/sync-distances', { method: 'POST', body: JSON.stringify({}) }),
  getRouteGeometry: (body) => request('/route-geometry', { method: 'POST', body: JSON.stringify(body) }),
};

window.API = API;
