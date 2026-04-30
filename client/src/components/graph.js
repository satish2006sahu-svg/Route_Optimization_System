/**
 * Graph Visualization Component — D3.js interactive graph.
 * Features: zoom/pan, node drag, path highlighting, weight labels, path animation.
 */

function createGraphVisualization(container, options = {}) {
  const width = options.width || container.clientWidth || 800;
  const height = options.height || 500;
  const highlightPath = options.highlightPath || [];
  const onNodeClick = options.onNodeClick || null;

  container.innerHTML = '';

  const svg = d3.select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('background', 'var(--card)');

  // Defs for arrow markers and gradients
  const defs = svg.append('defs');
  defs.append('marker')
    .attr('id', 'arrowhead')
    .attr('viewBox', '-0 -5 10 10')
    .attr('refX', 28).attr('refY', 0)
    .attr('orient', 'auto')
    .attr('markerWidth', 8).attr('markerHeight', 8)
    .append('path').attr('d', 'M 0,-5 L 10,0 L 0,5')
    .attr('fill', '#94A3B8');

  defs.append('marker')
    .attr('id', 'arrowhead-highlight')
    .attr('viewBox', '-0 -5 10 10')
    .attr('refX', 28).attr('refY', 0)
    .attr('orient', 'auto')
    .attr('markerWidth', 8).attr('markerHeight', 8)
    .append('path').attr('d', 'M 0,-5 L 10,0 L 0,5')
    .attr('fill', '#2563EB');

  // Glow filter
  const filter = defs.append('filter').attr('id', 'glow');
  filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
  const feMerge = filter.append('feMerge');
  feMerge.append('feMergeNode').attr('in', 'coloredBlur');
  feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

  // Zoom
  const g = svg.append('g');
  const zoom = d3.zoom()
    .scaleExtent([0.3, 4])
    .on('zoom', (event) => g.attr('transform', event.transform));
  svg.call(zoom);

  // State
  let graphData = null;
  let simulation = null;

  function render(data, pathToHighlight = []) {
    graphData = data;
    g.selectAll('*').remove();

    if (!data || !data.cities || !data.roads) return;

    const cities = data.cities;
    const roads = data.roads;

    // Build highlight edge set
    const highlightEdges = new Set();
    for (let i = 0; i < pathToHighlight.length - 1; i++) {
      highlightEdges.add(`${pathToHighlight[i]}->${pathToHighlight[i + 1]}`);
      highlightEdges.add(`${pathToHighlight[i + 1]}->${pathToHighlight[i]}`);
    }
    const highlightNodes = new Set(pathToHighlight);

    // Prepare nodes and links for force simulation
    const nodes = cities.map(c => ({
      id: c.id, name: c.name,
      x: c.lat || (Math.random() * width * 0.6 + width * 0.2),
      y: c.lng || (Math.random() * height * 0.6 + height * 0.2),
    }));

    const links = roads.map(r => ({
      source: r.source, target: r.destination,
      weight: r.effectiveWeight || r.weight,
      baseWeight: r.weight,
      isDirected: r.isDirected,
      id: r.id,
      trafficMultiplier: r.trafficMultiplier || 1,
    }));

    // Force simulation
    simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(d => Math.min(180, 60 + d.weight / 10)))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    // Links (edges)
    const link = g.append('g').attr('class', 'links')
      .selectAll('line')
      .data(links).enter().append('line')
      .attr('stroke', d => {
        const key = `${typeof d.source === 'object' ? d.source.id : d.source}->${typeof d.target === 'object' ? d.target.id : d.target}`;
        return highlightEdges.has(key) ? '#2563EB' : (d.trafficMultiplier > 1.5 ? '#EF4444' : '#CBD5E1');
      })
      .attr('stroke-width', d => {
        const key = `${typeof d.source === 'object' ? d.source.id : d.source}->${typeof d.target === 'object' ? d.target.id : d.target}`;
        return highlightEdges.has(key) ? 4 : 2;
      })
      .attr('stroke-opacity', d => {
        if (pathToHighlight.length === 0) return 0.7;
        const key = `${typeof d.source === 'object' ? d.source.id : d.source}->${typeof d.target === 'object' ? d.target.id : d.target}`;
        return highlightEdges.has(key) ? 1 : 0.2;
      })
      .attr('marker-end', d => d.isDirected ? (highlightEdges.size > 0 ? 'url(#arrowhead-highlight)' : 'url(#arrowhead)') : null);

    // Edge weight labels
    const edgeLabels = g.append('g').attr('class', 'edge-labels')
      .selectAll('text')
      .data(links).enter().append('text')
      .attr('font-size', '10px')
      .attr('fill', d => {
        const key = `${typeof d.source === 'object' ? d.source.id : d.source}->${typeof d.target === 'object' ? d.target.id : d.target}`;
        return highlightEdges.has(key) ? '#2563EB' : '#94A3B8';
      })
      .attr('font-weight', '600')
      .attr('text-anchor', 'middle')
      .text(d => d.weight + ' km');

    // Node groups
    const node = g.append('g').attr('class', 'nodes')
      .selectAll('g')
      .data(nodes).enter().append('g')
      .attr('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x; d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null; d.fy = null;
        })
      );

    // Node outer glow for highlighted
    node.filter(d => highlightNodes.has(d.id))
      .append('circle')
      .attr('r', 28)
      .attr('fill', 'rgba(37, 99, 235, 0.15)')
      .attr('filter', 'url(#glow)');

    // Node circles
    node.append('circle')
      .attr('r', 20)
      .attr('fill', d => highlightNodes.has(d.id) ? '#2563EB' : '#1E293B')
      .attr('stroke', d => highlightNodes.has(d.id) ? '#fff' : '#475569')
      .attr('stroke-width', d => highlightNodes.has(d.id) ? 3 : 2)
      .attr('opacity', d => {
        if (pathToHighlight.length === 0) return 1;
        return highlightNodes.has(d.id) ? 1 : 0.3;
      });

    // Node labels
    node.append('text')
      .attr('dy', 35)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', '700')
      .attr('fill', d => {
        if (pathToHighlight.length === 0) return 'var(--text)';
        return highlightNodes.has(d.id) ? '#2563EB' : '#94A3B8';
      })
      .text(d => d.name);

    // Node initial letter inside circle
    node.append('text')
      .attr('dy', 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', '800')
      .attr('fill', '#fff')
      .text(d => d.name.charAt(0));

    // Hover tooltip
    node.on('mouseover', function (event, d) {
      d3.select(this).select('circle:last-of-type').transition().duration(200).attr('r', 24);
      // Show tooltip
      const tooltip = g.append('g').attr('class', 'tooltip-g')
        .attr('transform', `translate(${d.x + 30}, ${d.y - 10})`);
      tooltip.append('rect')
        .attr('rx', 6).attr('ry', 6)
        .attr('width', 120).attr('height', 30)
        .attr('fill', 'rgba(15,23,42,0.9)');
      tooltip.append('text')
        .attr('x', 10).attr('y', 20)
        .attr('fill', '#fff').attr('font-size', '11px')
        .text(d.name);
    })
    .on('mouseout', function () {
      d3.select(this).select('circle:last-of-type').transition().duration(200).attr('r', 20);
      g.selectAll('.tooltip-g').remove();
    })
    .on('click', function (event, d) {
      if (onNodeClick) onNodeClick(d.id, d.name);
    });

    // Simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);

      edgeLabels
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2 - 6);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
  }

  function animatePath(pathIds, delayMs = 400) {
    if (!pathIds || pathIds.length < 2) return;
    // Animate nodes one by one
    pathIds.forEach((nodeId, i) => {
      setTimeout(() => {
        g.selectAll('.nodes g').each(function (d) {
          if (d.id === nodeId) {
            d3.select(this).select('circle:last-of-type')
              .transition().duration(300)
              .attr('r', 28).attr('fill', '#22C55E')
              .transition().duration(300)
              .attr('r', 20).attr('fill', '#2563EB');
          }
        });
      }, i * delayMs);
    });
  }

  function resetZoom() {
    svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
  }

  return { render, animatePath, resetZoom };
}

window.createGraphVisualization = createGraphVisualization;
