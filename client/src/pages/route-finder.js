/**
 * Route Finder Page — Core feature: find shortest paths between cities.
 */

let routeGraphViz = null;

async function renderRoutePage(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">🧭 Route Finder</h2>
      <p class="page-subtitle">Find the optimal path between any two cities</p>
    </div>
    <div class="grid-2">
      <div>
        <div class="card" style="margin-bottom: 20px;">
          <div class="card-header"><span class="card-title">Configure Route</span></div>
          <div class="form-group">
            <label class="form-label">Source City</label>
            <select class="form-select" id="route-source"></select>
          </div>
          <div class="form-group">
            <label class="form-label">Destination City</label>
            <select class="form-select" id="route-dest"></select>
          </div>
          <div class="form-group">
            <label class="form-label">Algorithm</label>
            <select class="form-select" id="route-algo">
              <option value="bellman-ford">Bellman-Ford (Single Source)</option>
              <option value="floyd-warshall">Floyd-Warshall (All Pairs)</option>
            </select>
          </div>
          <button class="btn btn-primary btn-lg" style="width:100%;" onclick="findRoute()">
            🔍 Find Shortest Route
          </button>
        </div>
        <div id="route-result"></div>
      </div>
      <div class="card" style="min-height:450px;">
        <div class="card-header">
          <span class="card-title">Graph Visualization</span>
          <button class="btn btn-sm btn-secondary" onclick="routeResetView()">Reset View</button>
        </div>
        <div id="route-graph-container"></div>
      </div>
    </div>
  `;

  try {
    const graphData = await API.getGraph();
    window._routeGraphData = graphData;

    const srcSel = document.getElementById('route-source');
    const dstSel = document.getElementById('route-dest');
    graphData.cities.forEach(c => {
      srcSel.innerHTML += `<option value="${c.id}">${c.name}</option>`;
      dstSel.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });
    if (graphData.cities.length > 1) dstSel.selectedIndex = graphData.cities.length - 1;

    const gc = document.getElementById('route-graph-container');
    routeGraphViz = createGraphVisualization(gc, {
      height: 420,
      onNodeClick: (id, name) => {
        const src = document.getElementById('route-source');
        const dst = document.getElementById('route-dest');
        if (!src._lastClicked) { src.value = id; src._lastClicked = true; }
        else { dst.value = id; src._lastClicked = false; }
        showToast(`Selected: ${name}`, 'info');
      }
    });
    routeGraphViz.render(graphData);
  } catch (e) {
    showToast('Failed to load graph data', 'error');
  }
}

async function findRoute() {
  const source = document.getElementById('route-source').value;
  const dest = document.getElementById('route-dest').value;
  const algo = document.getElementById('route-algo').value;
  const resultDiv = document.getElementById('route-result');

  if (source === dest) {
    resultDiv.innerHTML = '<div class="card" style="border-color:var(--warning);"><p style="color:var(--warning);font-weight:600;">⚠️ Source and destination must be different.</p></div>';
    return;
  }

  resultDiv.innerHTML = '<div class="card"><div class="skeleton" style="height:60px;"></div></div>';

  try {
    const data = await API.computeRoute({ source, destination: dest, algorithm: algo });

    if (data.has_negative_cycle) {
      resultDiv.innerHTML = `<div class="card" style="border-color:var(--danger);">
        <p style="color:var(--danger);font-weight:700;">⚠️ Negative cycle detected!</p>
        <p style="color:var(--text-muted);font-size:0.85rem;">The graph contains a negative-weight cycle. Results may be unreliable.</p>
      </div>`;
      return;
    }

    if (!data.path || data.path.length === 0) {
      resultDiv.innerHTML = `<div class="card" style="border-color:var(--warning);">
        <p style="font-weight:700;color:var(--warning);">🚫 No path found</p>
        <p style="color:var(--text-muted);font-size:0.85rem;">These cities are not connected in the current graph.</p>
      </div>`;
      if (routeGraphViz && window._routeGraphData) routeGraphViz.render(window._routeGraphData, []);
      return;
    }

    // Estimate time (assume 60 km/h avg)
    const timeHours = (data.distance / 60).toFixed(1);

    resultDiv.innerHTML = `
      <div class="route-result">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
          <div>
            <div style="font-size:0.8rem;color:var(--text-muted);font-weight:500;">TOTAL DISTANCE</div>
            <div style="font-size:2rem;font-weight:800;color:var(--primary);">${data.distance} <span style="font-size:1rem;">km</span></div>
          </div>
          <div>
            <div style="font-size:0.8rem;color:var(--text-muted);font-weight:500;">EST. TRAVEL TIME</div>
            <div style="font-size:2rem;font-weight:800;color:var(--accent);">${timeHours} <span style="font-size:1rem;">hrs</span></div>
          </div>
          <div>
            <div style="font-size:0.8rem;color:var(--text-muted);font-weight:500;">ALGORITHM</div>
            <div style="font-size:1rem;font-weight:700;">${data.algorithm}</div>
            <span class="badge badge-primary">${data.execution_time_ms} ms</span>
          </div>
        </div>
        <div style="margin-top:16px;">
          <div style="font-size:0.8rem;color:var(--text-muted);font-weight:600;margin-bottom:8px;">ROUTE PATH (${data.path.length} stops)</div>
          <div class="route-path">
            ${data.path_names.map((n, i) => `<span class="route-node" style="animation-delay:${i * 0.1}s;">${n}</span>${i < data.path_names.length - 1 ? '<span class="route-arrow">→</span>' : ''}`).join('')}
          </div>
        </div>
      </div>
    `;

    // Update graph with highlighted path
    if (routeGraphViz && window._routeGraphData) {
      routeGraphViz.render(window._routeGraphData, data.path);
      setTimeout(() => routeGraphViz.animatePath(data.path), 500);
    }
  } catch (e) {
    resultDiv.innerHTML = `<div class="card" style="border-color:var(--danger);"><p style="color:var(--danger);">${e.message}</p></div>`;
  }
}

function routeResetView() {
  if (routeGraphViz) routeGraphViz.resetZoom();
  if (routeGraphViz && window._routeGraphData) routeGraphViz.render(window._routeGraphData, []);
}

window.renderRoutePage = renderRoutePage;
window.findRoute = findRoute;
window.routeResetView = routeResetView;
