/**
 * Graph View Page — Full interactive graph visualization.
 */

let fullGraphViz = null;

async function renderGraphPage(container) {
  container.innerHTML = `
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <h2 class="page-title">🔗 Graph Visualization</h2>
        <p class="page-subtitle">Interactive network map — drag nodes, zoom, and pan</p>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-sm btn-secondary" onclick="graphResetZoom()">↺ Reset</button>
      </div>
    </div>
    <div class="card graph-container" style="min-height: 550px;">
      <div id="full-graph-container" style="width:100%;"></div>
    </div>
    <div class="grid-3" style="margin-top: 20px;" id="graph-legend">
      <div class="card" style="padding:16px;">
        <h4 style="font-size:0.85rem;font-weight:700;margin-bottom:8px;">🎮 Controls</h4>
        <ul style="font-size:0.8rem;color:var(--text-muted);list-style:none;line-height:2;">
          <li>🖱️ Scroll to zoom in/out</li>
          <li>✋ Click & drag to pan</li>
          <li>👆 Drag nodes to reposition</li>
          <li>🖱️ Hover for city details</li>
        </ul>
      </div>
      <div class="card" style="padding:16px;">
        <h4 style="font-size:0.85rem;font-weight:700;margin-bottom:8px;">🎨 Legend</h4>
        <ul style="font-size:0.8rem;color:var(--text-muted);list-style:none;line-height:2;">
          <li>⚫ Dark nodes = Cities</li>
          <li>🔵 Blue nodes = Selected path</li>
          <li>🔴 Red edges = Heavy traffic</li>
          <li>⬜ Gray edges = Normal roads</li>
        </ul>
      </div>
      <div class="card" style="padding:16px;" id="graph-info">
        <h4 style="font-size:0.85rem;font-weight:700;margin-bottom:8px;">📊 Graph Info</h4>
        <div class="skeleton" style="height:60px;"></div>
      </div>
    </div>
  `;

  try {
    const graphData = await API.getGraph();
    const analytics = await API.getAnalytics();

    const gc = document.getElementById('full-graph-container');
    fullGraphViz = createGraphVisualization(gc, { height: 520 });
    fullGraphViz.render(graphData);

    document.getElementById('graph-info').innerHTML = `
      <h4 style="font-size:0.85rem;font-weight:700;margin-bottom:8px;">📊 Graph Info</h4>
      <ul style="font-size:0.8rem;color:var(--text-muted);list-style:none;line-height:2;">
        <li>Cities: <strong>${analytics.totalCities}</strong></li>
        <li>Roads: <strong>${analytics.totalRoads}</strong></li>
        <li>Total Distance: <strong>${analytics.totalWeight} km</strong></li>
        <li>Avg Path: <strong>${analytics.averagePathLength} km</strong></li>
      </ul>
    `;
  } catch (e) {
    showToast('Failed to load graph', 'error');
  }
}

function graphResetZoom() {
  if (fullGraphViz) fullGraphViz.resetZoom();
}

window.renderGraphPage = renderGraphPage;
window.graphResetZoom = graphResetZoom;
