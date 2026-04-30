/**
 * Algorithm Comparison Page — Compare Bellman-Ford vs Floyd-Warshall.
 */

async function renderComparePage(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">⚡ Algorithm Comparison</h2>
      <p class="page-subtitle">Compare Bellman-Ford and Floyd-Warshall side-by-side</p>
    </div>
    <div class="card" style="margin-bottom: 24px;">
      <div class="card-header"><span class="card-title">Run Comparison</span></div>
      <div class="grid-3" style="gap:12px;align-items:end;">
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label">Source</label>
          <select class="form-select" id="cmp-source"></select>
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label">Destination</label>
          <select class="form-select" id="cmp-dest"></select>
        </div>
        <button class="btn btn-primary" onclick="runComparison()">⚡ Compare</button>
      </div>
    </div>
    <div id="cmp-results"></div>
    <div class="grid-2" style="margin-top: 24px;">
      <div class="card">
        <div class="card-header"><span class="card-title">📚 Bellman-Ford</span><span class="badge badge-primary">Single Source</span></div>
        <table>
          <tr><td style="font-weight:600;">Time Complexity</td><td><code>O(V × E)</code></td></tr>
          <tr><td style="font-weight:600;">Space Complexity</td><td><code>O(V)</code></td></tr>
          <tr><td style="font-weight:600;">Negative Weights</td><td><span class="badge badge-accent">✓ Supported</span></td></tr>
          <tr><td style="font-weight:600;">Negative Cycles</td><td><span class="badge badge-accent">✓ Detected</span></td></tr>
          <tr><td style="font-weight:600;">Best For</td><td>Single-source queries, sparse graphs</td></tr>
        </table>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">📚 Floyd-Warshall</span><span class="badge badge-accent">All Pairs</span></div>
        <table>
          <tr><td style="font-weight:600;">Time Complexity</td><td><code>O(V³)</code></td></tr>
          <tr><td style="font-weight:600;">Space Complexity</td><td><code>O(V²)</code></td></tr>
          <tr><td style="font-weight:600;">Negative Weights</td><td><span class="badge badge-accent">✓ Supported</span></td></tr>
          <tr><td style="font-weight:600;">Negative Cycles</td><td><span class="badge badge-accent">✓ Detected</span></td></tr>
          <tr><td style="font-weight:600;">Best For</td><td>All-pairs queries, dense graphs</td></tr>
        </table>
      </div>
    </div>
  `;

  try {
    const graphData = await API.getGraph();
    const srcSel = document.getElementById('cmp-source');
    const dstSel = document.getElementById('cmp-dest');
    graphData.cities.forEach(c => {
      srcSel.innerHTML += `<option value="${c.id}">${c.name}</option>`;
      dstSel.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });
    if (graphData.cities.length > 1) dstSel.selectedIndex = graphData.cities.length - 1;
  } catch (e) {
    showToast('Failed to load cities', 'error');
  }
}

async function runComparison() {
  const src = document.getElementById('cmp-source').value;
  const dst = document.getElementById('cmp-dest').value;
  const resultsDiv = document.getElementById('cmp-results');

  if (src === dst) { showToast('Select different cities', 'error'); return; }

  resultsDiv.innerHTML = '<div class="card"><div class="skeleton" style="height:80px;"></div></div>';

  try {
    const data = await API.compareAlgorithms({ source: src, destination: dst });
    const bf = data.bellman_ford;
    const fw = data.floyd_warshall;

    const maxTime = Math.max(bf.execution_time_ms, fw.execution_time_ms) || 1;
    const bfPct = Math.max(10, (bf.execution_time_ms / maxTime) * 100);
    const fwPct = Math.max(10, (fw.execution_time_ms / maxTime) * 100);

    resultsDiv.innerHTML = `
      <div class="card animate-up">
        <div class="card-header"><span class="card-title">📊 Results</span></div>
        <div class="grid-2" style="margin-bottom: 20px;">
          <div style="padding: 16px; background: rgba(37,99,235,0.05); border-radius: var(--radius-sm);">
            <div style="font-size:0.75rem;color:var(--text-muted);font-weight:600;">BELLMAN-FORD</div>
            <div style="font-size:1.5rem;font-weight:800;color:var(--primary);">${bf.distance != null ? bf.distance + ' km' : 'No path'}</div>
            <div style="font-size:0.8rem;color:var(--text-muted);">${bf.path_names ? bf.path_names.join(' → ') : 'N/A'}</div>
            <span class="badge badge-primary" style="margin-top:6px;">${bf.execution_time_ms} ms</span>
          </div>
          <div style="padding: 16px; background: rgba(34,197,94,0.05); border-radius: var(--radius-sm);">
            <div style="font-size:0.75rem;color:var(--text-muted);font-weight:600;">FLOYD-WARSHALL</div>
            <div style="font-size:1.5rem;font-weight:800;color:var(--accent);">${fw.distance != null ? fw.distance + ' km' : 'No path'}</div>
            <div style="font-size:0.8rem;color:var(--text-muted);">${fw.path_names ? fw.path_names.join(' → ') : 'N/A'}</div>
            <span class="badge badge-accent" style="margin-top:6px;">${fw.execution_time_ms} ms</span>
          </div>
        </div>
        <h4 style="font-size:0.85rem;font-weight:700;margin-bottom:12px;">⏱️ Execution Time Comparison</h4>
        <div class="comparison-bar">
          <div class="label">Bellman-Ford</div>
          <div class="bar"><div class="bar-fill bf" style="width:${bfPct}%;">${bf.execution_time_ms} ms</div></div>
        </div>
        <div class="comparison-bar">
          <div class="label">Floyd-Warshall</div>
          <div class="bar"><div class="bar-fill fw" style="width:${fwPct}%;">${fw.execution_time_ms} ms</div></div>
        </div>
        ${bf.distance === fw.distance ? '<p style="color:var(--accent);font-weight:600;margin-top:12px;">✅ Both algorithms agree on the shortest distance!</p>' : '<p style="color:var(--warning);font-weight:600;margin-top:12px;">⚠️ Results differ — check for edge cases.</p>'}
      </div>
    `;
  } catch (e) {
    resultsDiv.innerHTML = `<div class="card" style="border-color:var(--danger);"><p style="color:var(--danger);">${e.message}</p></div>`;
  }
}

window.renderComparePage = renderComparePage;
window.runComparison = runComparison;
