/**
 * Manage Cities Page — CRUD for cities and roads.
 */

async function renderManagePage(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">🏙️ Manage Cities & Roads</h2>
      <p class="page-subtitle">Add, update, or remove cities and road connections</p>
    </div>
    <div class="tabs">
      <button class="tab active" onclick="switchManageTab('cities', this)">🏙️ Cities</button>
      <button class="tab" onclick="switchManageTab('roads', this)">🛣️ Roads</button>
    </div>
    <div id="manage-tab-content"></div>
  `;
  switchManageTab('cities', document.querySelector('.tab.active'));
}

async function switchManageTab(tab, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  const content = document.getElementById('manage-tab-content');

  if (tab === 'cities') {
    content.innerHTML = `
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><span class="card-title">Add New City</span></div>
          <div class="form-group">
            <label class="form-label">City Name</label>
            <input class="form-input" id="new-city-name" placeholder="e.g. Chandigarh">
          </div>
          <button class="btn btn-accent" onclick="addNewCity()">+ Add City</button>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">All Cities</span></div>
          <div id="cities-list"><div class="skeleton" style="height:100px;"></div></div>
        </div>
      </div>
    `;
    await loadCitiesList();
  } else {
    content.innerHTML = `
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><span class="card-title">Add New Road</span></div>
          <div class="form-group">
            <label class="form-label">Source City</label>
            <select class="form-select" id="road-source"></select>
          </div>
          <div class="form-group">
            <label class="form-label">Destination City</label>
            <select class="form-select" id="road-dest"></select>
          </div>
          <div class="form-group">
            <label class="form-label">Distance (km)</label>
            <input class="form-input" type="number" id="road-weight" placeholder="e.g. 350" min="1">
          </div>
          <div class="form-group">
            <label class="form-label">Type</label>
            <select class="form-select" id="road-directed">
              <option value="false">Undirected (both ways)</option>
              <option value="true">Directed (one way)</option>
            </select>
          </div>
          <button class="btn btn-accent" onclick="addNewRoad()">+ Add Road</button>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">All Roads</span></div>
          <div id="roads-list"><div class="skeleton" style="height:100px;"></div></div>
        </div>
      </div>
    `;
    await loadRoadsList();
  }
}

async function loadCitiesList() {
  try {
    const cities = await API.getCities();
    const list = document.getElementById('cities-list');
    if (cities.length === 0) {
      list.innerHTML = '<div class="empty-state"><div class="icon">🏙️</div><div class="title">No cities yet</div></div>';
      return;
    }
    list.innerHTML = `<div class="table-wrapper"><table>
      <thead><tr><th>ID</th><th>Name</th><th>Actions</th></tr></thead>
      <tbody>${cities.map(c => `
        <tr>
          <td><code style="font-size:0.75rem;">${c.id}</code></td>
          <td style="font-weight:600;">${c.name}</td>
          <td>
            <button class="btn btn-sm btn-danger" onclick="deleteCity('${c.id}')">Delete</button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
  } catch (e) {
    showToast('Failed to load cities', 'error');
  }
}

async function loadRoadsList() {
  try {
    const [roads, cities] = await Promise.all([API.getRoads(), API.getCities()]);
    const cityMap = {};
    cities.forEach(c => cityMap[c.id] = c.name);

    // Populate selects
    const srcSel = document.getElementById('road-source');
    const dstSel = document.getElementById('road-dest');
    if (srcSel && dstSel) {
      cities.forEach(c => {
        srcSel.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        dstSel.innerHTML += `<option value="${c.id}">${c.name}</option>`;
      });
    }

    const list = document.getElementById('roads-list');
    if (roads.length === 0) {
      list.innerHTML = '<div class="empty-state"><div class="icon">🛣️</div><div class="title">No roads yet</div></div>';
      return;
    }
    list.innerHTML = `<div class="table-wrapper" style="max-height:350px;overflow-y:auto;"><table>
      <thead><tr><th>From</th><th>To</th><th>Distance</th><th>Type</th><th>Actions</th></tr></thead>
      <tbody>${roads.map(r => `
        <tr>
          <td style="font-weight:600;">${cityMap[r.source] || r.source}</td>
          <td style="font-weight:600;">${cityMap[r.destination] || r.destination}</td>
          <td>${r.weight} km</td>
          <td><span class="badge ${r.isDirected ? 'badge-warning' : 'badge-accent'}">${r.isDirected ? 'Directed' : 'Undirected'}</span></td>
          <td><button class="btn btn-sm btn-danger" onclick="deleteRoad('${r.id}')">Delete</button></td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
  } catch (e) {
    showToast('Failed to load roads', 'error');
  }
}

async function addNewCity() {
  const name = document.getElementById('new-city-name').value.trim();
  if (!name) { showToast('Enter a city name', 'error'); return; }
  try {
    await API.addCity({ name });
    showToast(`City "${name}" added!`, 'success');
    document.getElementById('new-city-name').value = '';
    await loadCitiesList();
  } catch (e) { showToast(e.message, 'error'); }
}

async function deleteCity(id) {
  if (!confirm('Delete this city and all connected roads?')) return;
  try {
    await API.deleteCity(id);
    showToast('City deleted', 'success');
    await loadCitiesList();
  } catch (e) { showToast(e.message, 'error'); }
}

async function addNewRoad() {
  const source = document.getElementById('road-source').value;
  const dest = document.getElementById('road-dest').value;
  const weight = parseFloat(document.getElementById('road-weight').value);
  const directed = document.getElementById('road-directed').value === 'true';

  if (source === dest) { showToast('Source and destination must differ', 'error'); return; }
  if (!weight || weight <= 0) { showToast('Enter a valid distance', 'error'); return; }

  try {
    await API.addRoad({ source, destination: dest, weight, isDirected: directed });
    showToast('Road added!', 'success');
    document.getElementById('road-weight').value = '';
    await loadRoadsList();
  } catch (e) { showToast(e.message, 'error'); }
}

async function deleteRoad(id) {
  if (!confirm('Delete this road?')) return;
  try {
    await API.deleteRoad(id);
    showToast('Road deleted', 'success');
    await loadRoadsList();
  } catch (e) { showToast(e.message, 'error'); }
}

window.renderManagePage = renderManagePage;
window.switchManageTab = switchManageTab;
window.addNewCity = addNewCity;
window.deleteCity = deleteCity;
window.addNewRoad = addNewRoad;
window.deleteRoad = deleteRoad;
