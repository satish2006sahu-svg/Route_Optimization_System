/**
 * Sidebar Component — Left navigation with page routing.
 */

function createSidebar(onNavigate) {
  const navItems = [
    { id: 'home',        icon: '🏠', label: 'Home',                section: 'main' },
    { id: 'route',       icon: '🧭', label: 'Route Finder',        section: 'main' },
    { id: 'graph',       icon: '🔗', label: 'Graph View',          section: 'main' },
    { id: 'map',         icon: '🗺️', label: 'Live Map',            section: 'main' },
    { id: 'compare',     icon: '⚡', label: 'Algorithm Compare',   section: 'analysis' },
    { id: 'traffic',     icon: '🚦', label: 'Traffic Simulation',  section: 'analysis' },
    { id: 'manage',      icon: '🏙️', label: 'Manage Cities',       section: 'management' },
    { id: 'analytics',   icon: '📊', label: 'Analytics',           section: 'management' },
  ];

  const sections = {
    main: 'Navigation',
    analysis: 'Analysis',
    management: 'Management',
  };

  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.id = 'sidebar';

  // Brand
  sidebar.innerHTML = `
    <div class="sidebar-brand">
      <div class="logo">R</div>
      <span>RouteOpt</span>
    </div>
    <nav class="sidebar-nav" id="sidebar-nav"></nav>
    <div style="padding: 16px 24px; border-top: 1px solid rgba(255,255,255,0.08);">
      <div style="font-size: 0.7rem; color: rgba(255,255,255,0.35);">v1.0.0 — Route Optimization</div>
    </div>
  `;

  const nav = sidebar.querySelector('#sidebar-nav');

  // Group items by section
  const grouped = {};
  navItems.forEach(item => {
    if (!grouped[item.section]) grouped[item.section] = [];
    grouped[item.section].push(item);
  });

  Object.entries(grouped).forEach(([sectionKey, items]) => {
    const section = document.createElement('div');
    section.className = 'nav-section';
    section.innerHTML = `<div class="nav-section-title">${sections[sectionKey]}</div>`;

    items.forEach(item => {
      const el = document.createElement('a');
      el.className = 'nav-item';
      el.dataset.page = item.id;
      el.innerHTML = `<span class="icon">${item.icon}</span> ${item.label}`;
      el.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        el.classList.add('active');
        onNavigate(item.id);
      });
      section.appendChild(el);
    });

    nav.appendChild(section);
  });

  // Set initial active
  setTimeout(() => {
    const first = sidebar.querySelector('.nav-item');
    if (first) first.classList.add('active');
  }, 0);

  return sidebar;
}

window.createSidebar = createSidebar;
