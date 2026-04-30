"""
Data models for the Route Optimization System.

Defines City, Road, and Graph classes with serialisation helpers.
Structured so migration to SQLite/PostgreSQL requires minimal changes.
"""

import uuid


class City:
    """Represents a city (graph node)."""

    def __init__(self, name, city_id=None, lat=None, lng=None):
        self.id = city_id or str(uuid.uuid4())[:8]
        self.name = name
        self.lat = lat  # optional coordinates for visualisation
        self.lng = lng

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'lat': self.lat,
            'lng': self.lng,
        }

    @staticmethod
    def from_dict(data):
        return City(
            name=data['name'],
            city_id=data.get('id'),
            lat=data.get('lat'),
            lng=data.get('lng'),
        )


class Road:
    """Represents a road (graph edge) between two cities."""

    def __init__(self, source, destination, weight, is_directed=False, road_id=None):
        self.id = road_id or str(uuid.uuid4())[:8]
        self.source = source
        self.destination = destination
        self.weight = weight
        self.is_directed = is_directed
        self.traffic_multiplier = 1.0  # for traffic simulation

    @property
    def effective_weight(self):
        return self.weight * self.traffic_multiplier

    def to_dict(self):
        return {
            'id': self.id,
            'source': self.source,
            'destination': self.destination,
            'weight': self.weight,
            'isDirected': self.is_directed,
            'trafficMultiplier': self.traffic_multiplier,
            'effectiveWeight': self.effective_weight,
        }

    @staticmethod
    def from_dict(data):
        road = Road(
            source=data['source'],
            destination=data['destination'],
            weight=data['weight'],
            is_directed=data.get('isDirected', False),
            road_id=data.get('id'),
        )
        road.traffic_multiplier = data.get('trafficMultiplier', 1.0)
        return road


class Graph:
    """
    In-memory graph built from cities and roads.
    Maintains an adjacency list for algorithm consumption.
    """

    def __init__(self):
        self.cities = {}   # id -> City
        self.roads = {}    # id -> Road

    # ---------- City operations ----------

    def add_city(self, city):
        self.cities[city.id] = city
        return city

    def remove_city(self, city_id):
        if city_id not in self.cities:
            return False
        # Remove associated roads
        roads_to_remove = [
            rid for rid, r in self.roads.items()
            if r.source == city_id or r.destination == city_id
        ]
        for rid in roads_to_remove:
            del self.roads[rid]
        del self.cities[city_id]
        return True

    def update_city(self, city_id, name):
        if city_id in self.cities:
            self.cities[city_id].name = name
            return True
        return False

    # ---------- Road operations ----------

    def add_road(self, road):
        self.roads[road.id] = road
        return road

    def remove_road(self, road_id):
        if road_id in self.roads:
            del self.roads[road_id]
            return True
        return False

    # ---------- Graph building ----------

    def get_adjacency_list(self, use_traffic=True):
        """
        Build adjacency list dict suitable for the algorithm layer.
        Keys are city **ids**; values are lists of (neighbor_id, weight).
        """
        adj = {cid: [] for cid in self.cities}
        for road in self.roads.values():
            w = road.effective_weight if use_traffic else road.weight
            adj.setdefault(road.source, []).append((road.destination, w))
            if not road.is_directed:
                adj.setdefault(road.destination, []).append((road.source, w))
        return adj

    # ---------- Serialisation ----------

    def to_dict(self):
        return {
            'cities': [c.to_dict() for c in self.cities.values()],
            'roads': [r.to_dict() for r in self.roads.values()],
        }

    def load_from_dict(self, data):
        """Populate graph from a dict (e.g. loaded from JSON file)."""
        self.cities.clear()
        self.roads.clear()
        for c in data.get('cities', []):
            city = City.from_dict(c)
            self.cities[city.id] = city
        for r in data.get('roads', []):
            road = Road.from_dict(r)
            self.roads[road.id] = road
