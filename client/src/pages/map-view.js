/**
 * Map View Page — Real interactive map with Leaflet.js + OpenStreetMap.
 * Shows cities on a real map, draws routes, fetches real driving distances.
 */

let mapInstance = null;
let mapMarkers = {};
let mapRouteLayer = null;
let mapRoadLines = [];

async function renderMapPage(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">🗺️ Live Map View</h2>
      <p class="page-subtitle">Real-world map with actual driving distances powered by OpenStreetMap</p>
    </div>
    <div class="grid-2" style="grid-template-columns: 1fr 380px;">
      <div>
        <div class="card" style="padding: 0; overflow: hidden; margin-bottom: 20px;">
          <div id="leaflet-map" style="height: 520px; width: 100%;"></div>
        </div>
        <div class="grid-3" id="map-stats">
          <div class="stat-card blue">
            <div class="stat-icon blue">🏙️</div>
            <div class="stat-info">
              <div class="stat-label">Cities on Map</div>
              <div class="stat-value" id="map-city-count">--</div>
            </div>
          </div>
          <div class="stat-card green">
            <div class="stat-icon green">🛣️</div>
            <div class="stat-info">
              <div class="stat-label">Roads Shown</div>
              <div class="stat-value" id="map-road-count">--</div>
            </div>
          </div>
          <div class="stat-card yellow">
            <div class="stat-icon yellow">📍</div>
            <div class="stat-info">
              <div class="stat-label">Route Distance</div>
              <div class="stat-value" id="map-route-dist">--</div>
            </div>
          </div>
        </div>
      </div>
      <div>
        <div class="card" style="margin-bottom: 16px;">
          <div class="card-header"><span class="card-title">🧭 Find Route on Map</span></div>
          <div class="form-group">
            <label class="form-label">From</label>
            <select class="form-select" id="map-from"></select>
          </div>
          <div class="form-group">
            <label class="form-label">To</label>
            <select class="form-select" id="map-to"></select>
          </div>
          <div class="form-group">
            <label class="form-label">Algorithm</label>
            <select class="form-select" id="map-algo">
              <option value="bellman-ford">Bellman-Ford</option>
              <option value="floyd-warshall">Floyd-Warshall</option>
            </select>
          </div>
          <button class="btn btn-primary" style="width:100%;" onclick="mapFindRoute()">
            🔍 Find & Draw Route
          </button>
          <button class="btn btn-secondary" style="width:100%;margin-top:8px;" onclick="mapClearRoute()">
            ✕ Clear Route
          </button>
          <div id="map-route-result" style="margin-top: 12px;"></div>
        </div>
        <div class="card" style="margin-bottom: 16px;">
          <div class="card-header"><span class="card-title">📏 Real Distance Check</span></div>
          <div class="grid-2" style="gap:8px;">
            <select class="form-select" id="real-dist-from"></select>
            <select class="form-select" id="real-dist-to"></select>
          </div>
          <button class="btn btn-accent btn-sm" style="width:100%;margin-top:8px;" onclick="checkRealDistance()">
            📡 Get Real Driving Distance
          </button>
          <div id="real-dist-result" style="margin-top:8px;"></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">🔄 Sync Real Distances</span></div>
          <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:12px;">
            Update all road weights in the graph with actual driving distances from OSRM routing engine.
          </p>
          <button class="btn btn-primary btn-sm" style="width:100%;" onclick="syncAllDistances()">
            🌐 Sync All Roads with Real Distances
          </button>
          <div id="sync-result" style="margin-top:8px;"></div>
        </div>
      </div>
    </div>
  `;

  try {
    const graphData = await API.getGraph();
    window._mapGraphData = graphData;

    // Populate dropdowns
    const selects = ['map-from', 'map-to', 'real-dist-from', 'real-dist-to'];
    selects.forEach(selId => {
      const sel = document.getElementById(selId);
      if (sel) {
        graphData.cities.forEach(c => {
          sel.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
      }
    });
    // Set different defaults for "To" selects
    const mapTo = document.getElementById('map-to');
    const realTo = document.getElementById('real-dist-to');
    if (mapTo && graphData.cities.length > 1) mapTo.selectedIndex = graphData.cities.length - 1;
    if (realTo && graphData.cities.length > 1) realTo.selectedIndex = 1;

    // Update stats
    document.getElementById('map-city-count').textContent = graphData.cities.length;
    document.getElementById('map-road-count').textContent = graphData.roads.length;

    // Initialize Leaflet map
    initLeafletMap(graphData);

  } catch (e) {
    showToast('Failed to load map data: ' + e.message, 'error');
  }
}

function initLeafletMap(graphData) {
  // Create map centered on India
  mapInstance = L.map('leaflet-map', {
    zoomControl: true,
    scrollWheelZoom: true,
  }).setView([22.0, 78.5], 5);

  // Tile layer — OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(mapInstance);

  // Custom city icon
  const cityIcon = L.divIcon({
    className: 'map-city-marker',
    html: '<div style="width:14px;height:14px;background:#2563EB;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(37,99,235,0.5);"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  // Add city markers
  mapMarkers = {};
  const bounds = [];
  graphData.cities.forEach(c => {
    if (c.lat && c.lng) {
      const marker = L.marker([c.lat, c.lng], { icon: cityIcon })
        .addTo(mapInstance)
        .bindPopup(`<strong>${c.name}</strong><br>ID: ${c.id}<br>Lat: ${c.lat}, Lng: ${c.lng}`);
      
      // City name label
      L.marker([c.lat, c.lng], {
        icon: L.divIcon({
          className: 'map-city-label',
          html: `<div style="font-size:11px;font-weight:700;color:#1E293B;text-shadow:1px 1px 2px #fff,-1px -1px 2px #fff,1px -1px 2px #fff,-1px 1px 2px #fff;white-space:nowrap;transform:translateY(-20px);text-align:center;">${c.name}</div>`,
          iconSize: [80, 20],
          iconAnchor: [40, 30],
        })
      }).addTo(mapInstance);

      mapMarkers[c.id] = marker;
      bounds.push([c.lat, c.lng]);
    }
  });

  // Draw road lines (gray, thin)
  mapRoadLines = [];
  const cityMap = {};
  graphData.cities.forEach(c => cityMap[c.id] = c);

  graphData.roads.forEach(r => {
    const src = cityMap[r.source];
    const dst = cityMap[r.destination];
    if (src && dst && src.lat && dst.lat) {
      const line = L.polyline([[src.lat, src.lng], [dst.lat, dst.lng]], {
        color: '#94A3B8',
        weight: 2,
        opacity: 0.5,
        dashArray: '6, 8',
      }).addTo(mapInstance);
      
      // Weight label at midpoint
      const midLat = (src.lat + dst.lat) / 2;
      const midLng = (src.lng + dst.lng) / 2;
      L.marker([midLat, midLng], {
        icon: L.divIcon({
          className: 'map-road-label',
          html: `<div style="font-size:9px;color:#64748B;background:rgba(255,255,255,0.85);padding:1px 5px;border-radius:8px;white-space:nowrap;font-weight:600;">${r.weight} km</div>`,
          iconSize: [60, 16],
          iconAnchor: [30, 8],
        })
      }).addTo(mapInstance);

      mapRoadLines.push(line);
    }
  });

  // Fit bounds
  if (bounds.length > 0) {
    mapInstance.fitBounds(bounds, { padding: [30, 30] });
  }
}

async function mapFindRoute() {
  const src = document.getElementById('map-from').value;
  const dst = document.getElementById('map-to').value;
  const algo = document.getElementById('map-algo').value;
  const resultDiv = document.getElementById('map-route-result');

  if (src === dst) { showToast('Select different cities', 'error'); return; }

  resultDiv.innerHTML = '<div class="skeleton" style="height:40px;"></div>';

  try {
    // 1. Compute route using our algorithms
    const routeData = await API.computeRoute({ source: src, destination: dst, algorithm: algo });

    if (!routeData.path || routeData.path.length === 0) {
      resultDiv.innerHTML = '<div style="color:var(--danger);font-weight:600;">No path found.</div>';
      return;
    }

    // 2. Get real road geometry from OSRM
    const geoData = await API.getRouteGeometry({ path: routeData.path });

    // 3. Clear previous route
    mapClearRoute();

    // 4. Draw route on map
    mapRouteLayer = L.layerGroup().addTo(mapInstance);

    let totalRealDist = 0;
    let totalRealTime = 0;

    if (geoData.segments && geoData.segments.length > 0) {
      geoData.segments.forEach((seg, i) => {
        const coords = seg.geometry.coordinates.map(c => [c[1], c[0]]);
        const polyline = L.polyline(coords, {
          color: '#2563EB',
          weight: 5,
          opacity: 0.9,
        });
        mapRouteLayer.addLayer(polyline);
        totalRealDist += seg.distance_km;
        totalRealTime += seg.duration_min;
      });

      // Fit map to route
      const allCoords = geoData.segments.flatMap(s => s.geometry.coordinates.map(c => [c[1], c[0]]));
      if (allCoords.length > 0) mapInstance.fitBounds(allCoords, { padding: [50, 50] });
    } else {
      // Fallback: draw straight lines if OSRM fails
      const cityMap = {};
      window._mapGraphData.cities.forEach(c => cityMap[c.id] = c);
      const coords = routeData.path.map(id => {
        const c = cityMap[id];
        return c ? [c.lat, c.lng] : null;
      }).filter(Boolean);
      L.polyline(coords, { color: '#2563EB', weight: 4 }).addTo(mapRouteLayer);
    }

    // Highlight route markers
    routeData.path.forEach(id => {
      if (mapMarkers[id]) {
        const latlng = mapMarkers[id].getLatLng();
        L.circleMarker(latlng, {
          radius: 10, color: '#2563EB', fillColor: '#22C55E',
          fillOpacity: 0.9, weight: 3,
        }).addTo(mapRouteLayer);
      }
    });

    // Update stats
    document.getElementById('map-route-dist').textContent = 
      totalRealDist > 0 ? totalRealDist.toFixed(0) + ' km' : routeData.distance + ' km';

    resultDiv.innerHTML = `
      <div class="route-result" style="padding:12px;">
        <div style="font-size:0.75rem;color:var(--text-muted);font-weight:600;">GRAPH ALGORITHM RESULT</div>
        <div style="font-weight:700;color:var(--primary);">Graph Distance: ${routeData.distance} km</div>
        ${totalRealDist > 0 ? `
          <div style="margin-top:8px;font-size:0.75rem;color:var(--text-muted);font-weight:600;">REAL DRIVING DATA (OSRM)</div>
          <div style="font-weight:700;color:var(--accent);">Real Distance: ${totalRealDist.toFixed(1)} km</div>
          <div style="font-weight:600;color:var(--text-muted);">Est. Drive Time: ${totalRealTime.toFixed(0)} min (${(totalRealTime / 60).toFixed(1)} hrs)</div>
        ` : ''}
        <div class="route-path" style="margin-top:8px;">
          ${routeData.path_names.map(n => `<span class="route-node">${n}</span>`).join('<span class="route-arrow">→</span>')}
        </div>
      </div>
    `;

  } catch (e) {
    resultDiv.innerHTML = `<div style="color:var(--danger);">${e.message}</div>`;
  }
}

function mapClearRoute() {
  if (mapRouteLayer) {
    mapInstance.removeLayer(mapRouteLayer);
    mapRouteLayer = null;
  }
  document.getElementById('map-route-dist').textContent = '--';
  const resultDiv = document.getElementById('map-route-result');
  if (resultDiv) resultDiv.innerHTML = '';
}

async function checkRealDistance() {
  const src = document.getElementById('real-dist-from').value;
  const dst = document.getElementById('real-dist-to').value;
  const resultDiv = document.getElementById('real-dist-result');

  if (src === dst) { showToast('Select different cities', 'error'); return; }

  resultDiv.innerHTML = '<div class="skeleton" style="height:30px;"></div>';

  try {
    const data = await API.getRealDistance({ source: src, destination: dst });
    resultDiv.innerHTML = `
      <div style="padding:10px;background:rgba(34,197,94,0.08);border-radius:8px;border:1px solid rgba(34,197,94,0.2);">
        <div style="font-weight:700;color:var(--accent);">
          ${data.source_name} → ${data.destination_name}
        </div>
        <div style="font-size:1.2rem;font-weight:800;color:var(--primary);">${data.distance_km} km</div>
        <div style="font-size:0.8rem;color:var(--text-muted);">
          🕐 ${data.duration_min} min (${(data.duration_min / 60).toFixed(1)} hrs driving)
        </div>
      </div>
    `;
  } catch (e) {
    resultDiv.innerHTML = `<div style="color:var(--danger);font-size:0.85rem;">${e.message}</div>`;
  }
}

async function syncAllDistances() {
  const resultDiv = document.getElementById('sync-result');
  resultDiv.innerHTML = '<div class="skeleton" style="height:30px;"></div>';

  try {
    showToast('Fetching real distances for all roads... This may take a moment.', 'info');
    const data = await API.syncDistances();
    resultDiv.innerHTML = `
      <div style="padding:10px;background:rgba(37,99,235,0.08);border-radius:8px;border:1px solid rgba(37,99,235,0.2);">
        <div style="font-weight:700;color:var(--primary);">✅ ${data.updated_count} roads updated</div>
        ${data.error_count > 0 ? `<div style="color:var(--warning);font-size:0.8rem;">${data.error_count} roads failed</div>` : ''}
        <div style="margin-top:8px;max-height:150px;overflow-y:auto;">
          ${(data.roads || []).map(r => `
            <div style="font-size:0.75rem;color:var(--text-muted);padding:2px 0;">
              ${r.source} → ${r.destination}: <strong>${r.new_weight} km</strong> (${r.duration_min} min)
            </div>
          `).join('')}
        </div>
      </div>
    `;
    showToast('All road distances synced with real data!', 'success');
  } catch (e) {
    resultDiv.innerHTML = `<div style="color:var(--danger);font-size:0.85rem;">${e.message}</div>`;
  }
}

window.renderMapPage = renderMapPage;
window.mapFindRoute = mapFindRoute;
window.mapClearRoute = mapClearRoute;
window.checkRealDistance = checkRealDistance;
window.syncAllDistances = syncAllDistances;
