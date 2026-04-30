/**
 * Home Dashboard — Overview cards with quick stats and navigation.
 */

async function renderHomePage(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">🚀 Route Optimization System</h2>
      <p class="page-subtitle">Interactive graph-based route planning with real-time analytics</p>
    </div>
    <div class="grid-4" id="home-stats" style="margin-bottom: 28px;"></div>
    <div class="grid-2" style="margin-bottom: 28px;">
      <div class="card" id="home-quick-graph" style="min-height: 350px;">
        <div class="card-header">
          <span class="card-title">🔗 Network Overview</span>
          <button class="btn btn-sm btn-secondary" onclick="window.navigateTo('graph')">Full View →</button>
        </div>
        <div id="home-graph-container" style="width:100%;"></div>
      </div>
      <div>
        <div class="card" style="margin-bottom: 20px;">
          <div class="card-header"><span class="card-title">⚡ Quick Route</span></div>
          <div class="grid-2" style="gap: 12px;">
            <div class="form-group">
              <label class="form-label">From</label>
              <select class="form-select" id="home-from"></select>
            </div>
            <div class="form-group">
              <label class="form-label">To</label>
              <select class="form-select" id="home-to"></select>
            </div>
          </div>
          <button class="btn btn-primary" style="width:100%;margin-top:8px;" onclick="homeQuickRoute()">Find Shortest Route</button>
          <div id="home-quick-result" style="margin-top: 12px;"></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">📋 Quick Links</span></div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <a class="btn btn-secondary" style="justify-content: flex-start;" onclick="window.navigateTo('route')">🧭 Route Finder</a>
            <a class="btn btn-secondary" style="justify-content: flex-start;" onclick="window.navigateTo('compare')">⚡ Compare Algorithms</a>
            <a class="btn btn-secondary" style="justify-content: flex-start;" onclick="window.navigateTo('traffic')">🚦 Traffic Simulation</a>
            <a class="btn btn-secondary" style="justify-content: flex-start;" onclick="window.navigateTo('manage')">🏙️ Manage Cities</a>
          </div>
        </div>
      </div>
    </div>
  `;

  try {
    const [graphData, analytics] = await Promise.all([API.getGraph(), API.getAnalytics()]);

    // Stats
    document.getElementById('home-stats').innerHTML = `
      <div class="stat-card blue animate-up" style="animation-delay: 0.1s;">
        <div class="stat-icon blue">🏙️</div>
        <div class="stat-info">
          <div class="stat-label">Total Cities</div>
          <div class="stat-value">${analytics.totalCities}</div>
        </div>
      </div>
      <div class="stat-card green animate-up" style="animation-delay: 0.2s;">
        <div class="stat-icon green">🛣️</div>
        <div class="stat-info">
          <div class="stat-label">Total Roads</div>
          <div class="stat-value">${analytics.totalRoads}</div>
        </div>
      </div>
      <div class="stat-card yellow animate-up" style="animation-delay: 0.3s;">
        <div class="stat-icon yellow">📏</div>
        <div class="stat-info">
          <div class="stat-label">Avg Edge Weight</div>
          <div class="stat-value">${analytics.averageEdgeWeight}</div>
          <div class="stat-change">km</div>
        </div>
      </div>
      <div class="stat-card red animate-up" style="animation-delay: 0.4s;">
        <div class="stat-icon red">⭐</div>
        <div class="stat-info">
          <div class="stat-label">Most Connected</div>
          <div class="stat-value" style="font-size:1.1rem;">${analytics.mostConnected ? analytics.mostConnected.name : 'N/A'}</div>
          <div class="stat-change">${analytics.mostConnected ? analytics.mostConnected.degree + ' connections' : ''}</div>
        </div>
      </div>
    `;

    // Populate selects
    const fromSel = document.getElementById('home-from');
    const toSel = document.getElementById('home-to');
    graphData.cities.forEach(c => {
      fromSel.innerHTML += `<option value="${c.id}">${c.name}</option>`;
      toSel.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });
    if (graphData.cities.length > 1) toSel.selectedIndex = 1;

    // Mini graph
    const gc = document.getElementById('home-graph-container');
    const viz = createGraphVisualization(gc, { height: 300 });
    viz.render(graphData);

  } catch (err) {
    showToast('Failed to load dashboard data', 'error');
  }
}

async function homeQuickRoute() {
  const src = document.getElementById('home-from').value;
  const dst = document.getElementById('home-to').value;
  const result = document.getElementById('home-quick-result');
  if (src === dst) { result.innerHTML = '<span style="color:var(--warning);">Select different cities.</span>'; return; }
  try {
    const data = await API.computeRoute({ source: src, destination: dst, algorithm: 'bellman-ford' });
    if (data.path && data.path.length > 0) {
      result.innerHTML = `
        <div class="route-result" style="padding:14px;">
          <div style="font-weight:700;color:var(--primary);">Distance: ${data.distance} km</div>
          <div class="route-path" style="margin-top:8px;">
            ${data.path_names.map(n => `<span class="route-node">${n}</span>`).join('<span class="route-arrow">→</span>')}
          </div>
        </div>`;
    } else {
      result.innerHTML = '<div class="route-result" style="padding:14px;color:var(--danger);">No path found.</div>';
    }
  } catch (e) {
    result.innerHTML = `<div style="color:var(--danger);">${e.message}</div>`;
  }
}

window.renderHomePage = renderHomePage;
window.homeQuickRoute = homeQuickRoute;
