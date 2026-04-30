/**
 * Analytics Dashboard — Graph statistics and metrics.
 */

async function renderAnalyticsPage(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">📊 Analytics Dashboard</h2>
      <p class="page-subtitle">Detailed statistics and metrics about the road network</p>
    </div>
    <div id="analytics-stats" class="grid-4" style="margin-bottom: 24px;">
      <div class="stat-card blue"><div class="skeleton" style="height:50px;width:100%;"></div></div>
      <div class="stat-card green"><div class="skeleton" style="height:50px;width:100%;"></div></div>
      <div class="stat-card yellow"><div class="skeleton" style="height:50px;width:100%;"></div></div>
      <div class="stat-card red"><div class="skeleton" style="height:50px;width:100%;"></div></div>
    </div>
    <div class="grid-2">
      <div class="card" id="analytics-degree">
        <div class="card-header"><span class="card-title">🔗 Node Degree Distribution</span></div>
        <div class="skeleton" style="height:200px;"></div>
      </div>
      <div class="card" id="analytics-chart">
        <div class="card-header"><span class="card-title">📈 Connectivity Chart</span></div>
        <div id="degree-chart-container" style="min-height:250px;"></div>
      </div>
    </div>
  `;

  try {
    const analytics = await API.getAnalytics();

    // Stat cards
    document.getElementById('analytics-stats').innerHTML = `
      <div class="stat-card blue animate-up">
        <div class="stat-icon blue">🏙️</div>
        <div class="stat-info">
          <div class="stat-label">Total Cities</div>
          <div class="stat-value">${analytics.totalCities}</div>
        </div>
      </div>
      <div class="stat-card green animate-up" style="animation-delay:0.1s;">
        <div class="stat-icon green">🛣️</div>
        <div class="stat-info">
          <div class="stat-label">Total Roads</div>
          <div class="stat-value">${analytics.totalRoads}</div>
        </div>
      </div>
      <div class="stat-card yellow animate-up" style="animation-delay:0.2s;">
        <div class="stat-icon yellow">📏</div>
        <div class="stat-info">
          <div class="stat-label">Avg Path Length</div>
          <div class="stat-value">${analytics.averagePathLength}</div>
          <div class="stat-change">km</div>
        </div>
      </div>
      <div class="stat-card red animate-up" style="animation-delay:0.3s;">
        <div class="stat-icon red">🏗️</div>
        <div class="stat-info">
          <div class="stat-label">Total Road Distance</div>
          <div class="stat-value">${analytics.totalWeight}</div>
          <div class="stat-change">km</div>
        </div>
      </div>
    `;

    // Degree table
    const sorted = (analytics.degreeDetails || []).sort((a, b) => b.degree - a.degree);
    const maxDegree = sorted.length > 0 ? sorted[0].degree : 1;

    document.getElementById('analytics-degree').innerHTML = `
      <div class="card-header"><span class="card-title">🔗 Node Degree Distribution</span></div>
      <div class="table-wrapper"><table>
        <thead><tr><th>City</th><th>Degree</th><th>Bar</th></tr></thead>
        <tbody>${sorted.map(d => `
          <tr>
            <td style="font-weight:600;">${d.name}</td>
            <td><span class="badge badge-primary">${d.degree}</span></td>
            <td style="width:50%;">
              <div style="background:var(--bg);border-radius:8px;height:20px;overflow:hidden;">
                <div style="width:${(d.degree / maxDegree) * 100}%;height:100%;background:linear-gradient(90deg,var(--primary),var(--accent));border-radius:8px;transition:width 0.8s ease;"></div>
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    `;

    // D3 bar chart
    renderDegreeChart(sorted);

  } catch (e) {
    showToast('Failed to load analytics', 'error');
  }
}

function renderDegreeChart(data) {
  const container = document.getElementById('degree-chart-container');
  if (!container || !data || data.length === 0) return;

  const margin = { top: 20, right: 20, bottom: 60, left: 50 };
  const width = container.clientWidth - margin.left - margin.right;
  const height = 250 - margin.top - margin.bottom;

  container.innerHTML = '';

  const svg = d3.select(container).append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand().domain(data.map(d => d.name)).range([0, width]).padding(0.3);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => d.degree) + 1]).range([height, 0]);

  // X axis
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .attr('transform', 'rotate(-40)')
    .style('text-anchor', 'end')
    .style('font-size', '10px')
    .style('fill', 'var(--text-muted)');

  // Y axis
  svg.append('g')
    .call(d3.axisLeft(y).ticks(5))
    .selectAll('text')
    .style('font-size', '10px')
    .style('fill', 'var(--text-muted)');

  // Bars
  svg.selectAll('.bar')
    .data(data).enter().append('rect')
    .attr('x', d => x(d.name))
    .attr('width', x.bandwidth())
    .attr('y', height)
    .attr('height', 0)
    .attr('rx', 4)
    .attr('fill', (d, i) => i === 0 ? '#2563EB' : '#3B82F6')
    .transition().duration(800).delay((d, i) => i * 80)
    .attr('y', d => y(d.degree))
    .attr('height', d => height - y(d.degree));

  // Value labels
  svg.selectAll('.label')
    .data(data).enter().append('text')
    .attr('x', d => x(d.name) + x.bandwidth() / 2)
    .attr('y', d => y(d.degree) - 6)
    .attr('text-anchor', 'middle')
    .style('font-size', '11px')
    .style('font-weight', '700')
    .style('fill', 'var(--primary)')
    .text(d => d.degree)
    .style('opacity', 0)
    .transition().duration(800).delay((d, i) => i * 80)
    .style('opacity', 1);
}

window.renderAnalyticsPage = renderAnalyticsPage;
