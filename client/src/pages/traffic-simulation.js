/**
 * Traffic Simulation Page — Modify edge weights and recompute paths.
 */

let trafficGraphViz = null;

async function renderTrafficPage(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">🚦 Traffic Simulation</h2>
      <p class="page-subtitle">Modify road conditions and see how routes change dynamically</p>
    </div>
    <div class="grid-2">
      <div>
        <div class="card" style="margin-bottom: 20px;">
          <div class="card-header">
            <span class="card-title">Traffic Controls</span>
            <button class="btn btn-sm btn-secondary" onclick="resetAllTraffic()">↺ Reset All</button>
          </div>
          <div id="traffic-controls" style="max-height: 400px; overflow-y: auto;"></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Test Route Under Traffic</span></div>
          <div class="grid-2" style="gap: 12px;">
            <div class="form-group">
              <label class="form-label">From</label>
              <select class="form-select" id="traffic-from"></select>
            </div>
            <div class="form-group">
              <label class="form-label">To</label>
              <select class="form-select" id="traffic-to"></select>
            </div>
          </div>
          <button class="btn btn-primary" style="width:100%;" onclick="trafficFindRoute()">🔍 Find Route with Traffic</button>
          <div id="traffic-route-result" style="margin-top:12px;"></div>
        </div>
      </div>
      <div class="card" style="min-height: 500px;">
        <div class="card-header"><span class="card-title">Live Network View</span></div>
        <div id="traffic-graph-container"></div>
      </div>
    </div>
  `;

  try {
    const graphData = await API.getGraph();
    window._trafficGraphData = graphData;

    // Populate city selects
    const fromSel = document.getElementById('traffic-from');
    const toSel = document.getElementById('traffic-to');
    graphData.cities.forEach(c => {
      fromSel.innerHTML += `<option value="${c.id}">${c.name}</option>`;
      toSel.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });
    if (graphData.cities.length > 1) toSel.selectedIndex = 1;

    // Build city name map
    const cityNames = {};
    graphData.cities.forEach(c => cityNames[c.id] = c.name);

    // Traffic sliders
    const controlsDiv = document.getElementById('traffic-controls');
    graphData.roads.forEach(r => {
      const srcName = cityNames[r.source] || r.source;
      const dstName = cityNames[r.destination] || r.destination;
      const mult = r.trafficMultiplier || 1;
      const condLabel = mult <= 1 ? '🟢 Clear' : mult <= 1.5 ? '🟡 Moderate' : mult <= 2 ? '🟠 Heavy' : '🔴 Severe';
      controlsDiv.innerHTML += `
        <div style="padding: 12px 0; border-bottom: 1px solid var(--border);" id="road-control-${r.id}">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-size:0.85rem;font-weight:600;">${srcName} ↔ ${dstName}</span>
            <span class="badge ${mult > 1.5 ? 'badge-danger' : mult > 1 ? 'badge-warning' : 'badge-accent'}" id="traffic-badge-${r.id}">${condLabel}</span>
          </div>
          <div class="slider-container">
            <span style="font-size:0.75rem;color:var(--text-muted);">1×</span>
            <input type="range" min="0.5" max="3" step="0.1" value="${mult}"
              id="slider-${r.id}"
              onchange="updateRoadTraffic('${r.id}', this.value)"
              oninput="document.getElementById('slider-val-${r.id}').textContent = (this.value) + '×'">
            <span style="font-size:0.75rem;color:var(--text-muted);">3×</span>
            <span style="font-size:0.8rem;font-weight:700;min-width:35px;text-align:right;" id="slider-val-${r.id}">${mult}×</span>
          </div>
          <div style="font-size:0.72rem;color:var(--text-muted);margin-top:4px;">
            Base: ${r.weight} km → Effective: <strong id="eff-${r.id}">${r.effectiveWeight}</strong> km
          </div>
        </div>
      `;
    });

    // Graph
    const gc = document.getElementById('traffic-graph-container');
    trafficGraphViz = createGraphVisualization(gc, { height: 460 });
    trafficGraphViz.render(graphData);
  } catch (e) {
    showToast('Failed to load traffic data', 'error');
  }
}

async function updateRoadTraffic(roadId, multiplier) {
  try {
    const result = await API.updateTraffic({ roadId, multiplier: parseFloat(multiplier) });
    // Update UI
    const mult = parseFloat(multiplier);
    const condLabel = mult <= 1 ? '🟢 Clear' : mult <= 1.5 ? '🟡 Moderate' : mult <= 2 ? '🟠 Heavy' : '🔴 Severe';
    const badge = document.getElementById(`traffic-badge-${roadId}`);
    if (badge) {
      badge.textContent = condLabel;
      badge.className = `badge ${mult > 1.5 ? 'badge-danger' : mult > 1 ? 'badge-warning' : 'badge-accent'}`;
    }
    const eff = document.getElementById(`eff-${roadId}`);
    if (eff && result) eff.textContent = result.effectiveWeight;

    // Refresh graph
    const graphData = await API.getGraph();
    window._trafficGraphData = graphData;
    if (trafficGraphViz) trafficGraphViz.render(graphData);
  } catch (e) {
    showToast('Failed to update traffic', 'error');
  }
}

async function resetAllTraffic() {
  try {
    await API.updateTraffic({ reset: true });
    showToast('Traffic reset to normal', 'success');
    const content = document.getElementById('main-content');
    renderTrafficPage(content);
  } catch (e) {
    showToast('Failed to reset traffic', 'error');
  }
}

async function trafficFindRoute() {
  const src = document.getElementById('traffic-from').value;
  const dst = document.getElementById('traffic-to').value;
  const resultDiv = document.getElementById('traffic-route-result');

  if (src === dst) { showToast('Select different cities', 'error'); return; }

  try {
    const data = await API.computeRoute({ source: src, destination: dst, algorithm: 'bellman-ford' });
    if (data.path && data.path.length > 0) {
      resultDiv.innerHTML = `
        <div class="route-result" style="padding:14px;">
          <div style="font-weight:700;color:var(--primary);">Distance (with traffic): ${data.distance} km</div>
          <div class="route-path" style="margin-top:8px;">
            ${data.path_names.map(n => `<span class="route-node">${n}</span>`).join('<span class="route-arrow">→</span>')}
          </div>
        </div>`;
      if (trafficGraphViz && window._trafficGraphData) {
        trafficGraphViz.render(window._trafficGraphData, data.path);
      }
    } else {
      resultDiv.innerHTML = '<div style="color:var(--danger);font-weight:600;">No path found.</div>';
    }
  } catch (e) {
    resultDiv.innerHTML = `<div style="color:var(--danger);">${e.message}</div>`;
  }
}

window.renderTrafficPage = renderTrafficPage;
window.updateRoadTraffic = updateRoadTraffic;
window.resetAllTraffic = resetAllTraffic;
window.trafficFindRoute = trafficFindRoute;
