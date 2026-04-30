"""
API Routes — RESTful endpoints for the Route Optimization System.

All responses are JSON with a consistent envelope:
  { "success": bool, "data": ..., "error": str|null }
"""

from flask import Blueprint, request, jsonify
import urllib.request
import json as json_module

api_bp = Blueprint('api', __name__, url_prefix='/api')

# The service instance is injected by app.py via init_routes()
_service = None


def init_routes(service):
    """Inject the GraphService instance so routes can use it."""
    global _service
    _service = service


def _ok(data):
    return jsonify({'success': True, 'data': data, 'error': None})


def _err(message, status=400):
    return jsonify({'success': False, 'data': None, 'error': message}), status


# ------------------------------------------------------------------ #
#  Cities
# ------------------------------------------------------------------ #

@api_bp.route('/cities', methods=['GET'])
def get_cities():
    """GET /api/cities — list all cities."""
    return _ok(_service.get_cities())


@api_bp.route('/city', methods=['POST'])
def add_city():
    """POST /api/city — add a new city."""
    data = request.get_json(silent=True)
    if not data or not data.get('name'):
        return _err('City name is required.')
    city = _service.add_city(
        name=data['name'],
        lat=data.get('lat'),
        lng=data.get('lng'),
    )
    return _ok(city), 201


@api_bp.route('/city/<city_id>', methods=['PUT'])
def update_city(city_id):
    """PUT /api/city/<id> — rename a city."""
    data = request.get_json(silent=True)
    if not data or not data.get('name'):
        return _err('City name is required.')
    ok = _service.update_city(city_id, data['name'])
    if ok:
        return _ok({'id': city_id, 'name': data['name']})
    return _err('City not found.', 404)


@api_bp.route('/city/<city_id>', methods=['DELETE'])
def delete_city(city_id):
    """DELETE /api/city/<id> — remove a city and its roads."""
    ok = _service.delete_city(city_id)
    if ok:
        return _ok({'deleted': city_id})
    return _err('City not found.', 404)


# ------------------------------------------------------------------ #
#  Roads
# ------------------------------------------------------------------ #

@api_bp.route('/roads', methods=['GET'])
def get_roads():
    """GET /api/roads — list all roads."""
    return _ok(_service.get_roads())


@api_bp.route('/road', methods=['POST'])
def add_road():
    """POST /api/road — add a new road."""
    data = request.get_json(silent=True)
    if not data:
        return _err('Request body is required.')
    required = ['source', 'destination', 'weight']
    for field in required:
        if field not in data:
            return _err(f'Field "{field}" is required.')
    try:
        weight = float(data['weight'])
    except (ValueError, TypeError):
        return _err('Weight must be a number.')

    road = _service.add_road(
        source=data['source'],
        destination=data['destination'],
        weight=weight,
        is_directed=data.get('isDirected', False),
    )
    if road is None:
        return _err('Source or destination city not found.', 404)
    return _ok(road), 201


@api_bp.route('/road/<road_id>', methods=['DELETE'])
def delete_road(road_id):
    """DELETE /api/road/<id> — remove a road."""
    ok = _service.delete_road(road_id)
    if ok:
        return _ok({'deleted': road_id})
    return _err('Road not found.', 404)


# ------------------------------------------------------------------ #
#  Graph
# ------------------------------------------------------------------ #

@api_bp.route('/graph', methods=['GET'])
def get_graph():
    """GET /api/graph — full graph data (cities + roads + adjacency list)."""
    return _ok(_service.get_graph())


# ------------------------------------------------------------------ #
#  Route computation
# ------------------------------------------------------------------ #

@api_bp.route('/route', methods=['POST'])
def compute_route():
    """
    POST /api/route — compute shortest path.
    Body: { source, destination, algorithm }
    """
    data = request.get_json(silent=True)
    if not data:
        return _err('Request body is required.')
    source = data.get('source')
    destination = data.get('destination')
    algorithm = data.get('algorithm', 'bellman-ford')

    if not source or not destination:
        return _err('Source and destination are required.')

    result = _service.compute_route(source, destination, algorithm)
    if 'error' in result:
        return _err(result['error'])
    return _ok(result)


# ------------------------------------------------------------------ #
#  Traffic simulation
# ------------------------------------------------------------------ #

@api_bp.route('/traffic', methods=['PUT'])
def update_traffic():
    """
    PUT /api/traffic — update traffic multiplier for a road.
    Body: { roadId, multiplier } or { reset: true }
    """
    data = request.get_json(silent=True)
    if not data:
        return _err('Request body is required.')

    if data.get('reset'):
        _service.reset_traffic()
        return _ok({'message': 'All traffic multipliers reset.'})

    road_id = data.get('roadId')
    multiplier = data.get('multiplier')
    if not road_id or multiplier is None:
        return _err('roadId and multiplier are required.')
    try:
        multiplier = float(multiplier)
    except (ValueError, TypeError):
        return _err('Multiplier must be a number.')

    result = _service.update_traffic(road_id, multiplier)
    if result:
        return _ok(result)
    return _err('Road not found.', 404)


# ------------------------------------------------------------------ #
#  Analytics
# ------------------------------------------------------------------ #

@api_bp.route('/analytics', methods=['GET'])
def get_analytics():
    """GET /api/analytics — graph statistics."""
    return _ok(_service.get_analytics())


# ------------------------------------------------------------------ #
#  Algorithm comparison
# ------------------------------------------------------------------ #

@api_bp.route('/compare', methods=['POST'])
def compare_algorithms():
    """
    POST /api/compare — run both algorithms and compare results.
    Body: { source, destination }
    """
    data = request.get_json(silent=True)
    if not data:
        return _err('Request body is required.')
    source = data.get('source')
    destination = data.get('destination')
    if not source or not destination:
        return _err('Source and destination are required.')

    bf_result = _service.compute_route(source, destination, 'bellman-ford')
    fw_result = _service.compute_route(source, destination, 'floyd-warshall')

    return _ok({
        'bellman_ford': bf_result,
        'floyd_warshall': fw_result,
    })


# ------------------------------------------------------------------ #
#  Real distance (OSRM — free, no API key)
# ------------------------------------------------------------------ #

def _osrm_distance(lat1, lng1, lat2, lng2):
    """
    Fetch real driving distance & duration from OSRM public API.
    Returns { distance_km, duration_min } or None on failure.
    """
    try:
        url = (
            f"http://router.project-osrm.org/route/v1/driving/"
            f"{lng1},{lat1};{lng2},{lat2}?overview=full&geometries=geojson"
        )
        req = urllib.request.Request(url, headers={'User-Agent': 'RouteOptimizer/1.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json_module.loads(resp.read().decode())
        if data.get('code') == 'Ok' and data.get('routes'):
            route = data['routes'][0]
            return {
                'distance_km': round(route['distance'] / 1000, 1),
                'duration_min': round(route['duration'] / 60, 1),
                'geometry': route['geometry'],  # GeoJSON for map drawing
            }
    except Exception as e:
        print(f"OSRM error: {e}")
    return None


@api_bp.route('/real-distance', methods=['POST'])
def get_real_distance():
    """
    POST /api/real-distance — get real driving distance between two cities.
    Body: { source, destination }
    """
    data = request.get_json(silent=True)
    if not data:
        return _err('Request body is required.')
    src_id = data.get('source')
    dst_id = data.get('destination')
    if not src_id or not dst_id:
        return _err('Source and destination are required.')

    cities = {c.id: c for c in _service.graph.cities.values()}
    src = cities.get(src_id)
    dst = cities.get(dst_id)
    if not src or not dst:
        return _err('City not found.', 404)
    if not src.lat or not dst.lat:
        return _err('Cities must have coordinates.')

    result = _osrm_distance(src.lat, src.lng, dst.lat, dst.lng)
    if result:
        return _ok({
            'source': src_id,
            'destination': dst_id,
            'source_name': src.name,
            'destination_name': dst.name,
            **result,
        })
    return _err('Failed to fetch real distance. Try again.', 502)


@api_bp.route('/sync-distances', methods=['POST'])
def sync_real_distances():
    """
    POST /api/sync-distances — update all road weights with real driving distances.
    Fetches from OSRM for every road in the graph.
    """
    cities = {c.id: c for c in _service.graph.cities.values()}
    roads = list(_service.graph.roads.values())
    updated = []
    errors = []

    for road in roads:
        src = cities.get(road.source)
        dst = cities.get(road.destination)
        if not src or not dst or not src.lat or not dst.lat:
            errors.append(road.id)
            continue
        result = _osrm_distance(src.lat, src.lng, dst.lat, dst.lng)
        if result:
            road.weight = result['distance_km']
            updated.append({
                'id': road.id,
                'source': src.name,
                'destination': dst.name,
                'old_weight': road.weight,
                'new_weight': result['distance_km'],
                'duration_min': result['duration_min'],
            })
        else:
            errors.append(road.id)

    _service._save_data()

    return _ok({
        'updated_count': len(updated),
        'error_count': len(errors),
        'roads': updated,
    })


@api_bp.route('/route-geometry', methods=['POST'])
def get_route_geometry():
    """
    POST /api/route-geometry — get real road geometry for a computed path.
    Body: { path: [city_id, city_id, ...] }
    Returns GeoJSON segments for each hop in the path.
    """
    data = request.get_json(silent=True)
    if not data or not data.get('path'):
        return _err('Path is required.')

    path = data['path']
    cities = {c.id: c for c in _service.graph.cities.values()}
    segments = []

    for i in range(len(path) - 1):
        src = cities.get(path[i])
        dst = cities.get(path[i + 1])
        if not src or not dst or not src.lat or not dst.lat:
            continue
        result = _osrm_distance(src.lat, src.lng, dst.lat, dst.lng)
        if result:
            segments.append({
                'from': src.name,
                'to': dst.name,
                'distance_km': result['distance_km'],
                'duration_min': result['duration_min'],
                'geometry': result['geometry'],
            })

    return _ok({'segments': segments})

