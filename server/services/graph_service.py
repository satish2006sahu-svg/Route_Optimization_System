"""
Graph Service — Business logic layer.

Sits between the API routes and the algorithm / data layers.
Handles graph CRUD, route computation, traffic simulation, and analytics.
"""

import json
import os
from backend.models.graph_model import Graph, City, Road
from backend.algorithms.bellman_ford import bellman_ford
from backend.algorithms.floyd_warshall import floyd_warshall

DATA_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'cities.json')


class GraphService:
    """Singleton-style service that manages the in-memory graph."""

    def __init__(self):
        self.graph = Graph()
        self._load_data()

    # ------------------------------------------------------------------ #
    #  Data persistence (JSON flat-file)
    # ------------------------------------------------------------------ #

    def _load_data(self):
        """Load graph from the JSON data file."""
        try:
            with open(DATA_FILE, 'r') as f:
                data = json.load(f)
            self.graph.load_from_dict(data)
        except FileNotFoundError:
            pass  # start with empty graph

    def _save_data(self):
        """Persist the current graph state to the JSON data file."""
        os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
        with open(DATA_FILE, 'w') as f:
            json.dump(self.graph.to_dict(), f, indent=2)

    # ------------------------------------------------------------------ #
    #  City operations
    # ------------------------------------------------------------------ #

    def get_cities(self):
        return [c.to_dict() for c in self.graph.cities.values()]

    def add_city(self, name, lat=None, lng=None):
        city = City(name=name, lat=lat, lng=lng)
        self.graph.add_city(city)
        self._save_data()
        return city.to_dict()

    def update_city(self, city_id, name):
        ok = self.graph.update_city(city_id, name)
        if ok:
            self._save_data()
        return ok

    def delete_city(self, city_id):
        ok = self.graph.remove_city(city_id)
        if ok:
            self._save_data()
        return ok

    # ------------------------------------------------------------------ #
    #  Road operations
    # ------------------------------------------------------------------ #

    def get_roads(self):
        return [r.to_dict() for r in self.graph.roads.values()]

    def add_road(self, source, destination, weight, is_directed=False):
        # Validate that both cities exist
        if source not in self.graph.cities or destination not in self.graph.cities:
            return None
        road = Road(source=source, destination=destination,
                    weight=weight, is_directed=is_directed)
        self.graph.add_road(road)
        self._save_data()
        return road.to_dict()

    def delete_road(self, road_id):
        ok = self.graph.remove_road(road_id)
        if ok:
            self._save_data()
        return ok

    # ------------------------------------------------------------------ #
    #  Graph data
    # ------------------------------------------------------------------ #

    def get_graph(self):
        """Return full graph data for the frontend."""
        adj = self.graph.get_adjacency_list(use_traffic=True)
        # Convert adjacency list to serialisable format
        adj_serialised = {}
        for node, neighbours in adj.items():
            adj_serialised[node] = [{'to': n, 'weight': w} for n, w in neighbours]
        return {
            'cities': [c.to_dict() for c in self.graph.cities.values()],
            'roads': [r.to_dict() for r in self.graph.roads.values()],
            'adjacencyList': adj_serialised,
        }

    # ------------------------------------------------------------------ #
    #  Route computation
    # ------------------------------------------------------------------ #

    def compute_route(self, source, destination, algorithm='bellman-ford'):
        """
        Compute the shortest path using the requested algorithm.
        Returns the result dict from the algorithm layer.
        """
        if source not in self.graph.cities or destination not in self.graph.cities:
            return {'error': 'Invalid source or destination city.'}

        adj = self.graph.get_adjacency_list(use_traffic=True)

        if algorithm == 'bellman-ford':
            result = bellman_ford(adj, source, destination)
        elif algorithm == 'floyd-warshall':
            result = floyd_warshall(adj, source, destination)
        else:
            return {'error': f'Unknown algorithm: {algorithm}'}

        # Enrich path with city names
        if result.get('path'):
            result['path_names'] = [
                self.graph.cities[cid].name
                for cid in result['path']
                if cid in self.graph.cities
            ]
        else:
            result['path_names'] = []

        return result

    def compute_all_pairs(self):
        """Run Floyd-Warshall for the full distance matrix."""
        adj = self.graph.get_adjacency_list(use_traffic=True)
        return floyd_warshall(adj)

    # ------------------------------------------------------------------ #
    #  Traffic simulation
    # ------------------------------------------------------------------ #

    def update_traffic(self, road_id, multiplier):
        """Set traffic multiplier for a specific road."""
        if road_id in self.graph.roads:
            self.graph.roads[road_id].traffic_multiplier = multiplier
            self._save_data()
            return self.graph.roads[road_id].to_dict()
        return None

    def reset_traffic(self):
        """Reset all traffic multipliers to 1.0."""
        for road in self.graph.roads.values():
            road.traffic_multiplier = 1.0
        self._save_data()
        return True

    # ------------------------------------------------------------------ #
    #  Analytics
    # ------------------------------------------------------------------ #

    def get_analytics(self):
        """Compute various graph analytics."""
        cities = self.graph.cities
        roads = self.graph.roads

        # Degree calculation (undirected edges count for both ends)
        degree = {cid: 0 for cid in cities}
        for road in roads.values():
            if road.source in degree:
                degree[road.source] += 1
            if not road.is_directed and road.destination in degree:
                degree[road.destination] += 1

        most_connected = max(degree, key=degree.get) if degree else None
        total_weight = sum(r.weight for r in roads.values())
        avg_weight = total_weight / len(roads) if roads else 0

        # Average shortest path (sample using Floyd-Warshall)
        adj = self.graph.get_adjacency_list(use_traffic=False)
        fw = floyd_warshall(adj)
        dist_matrix = fw.get('dist_matrix', {})
        finite_distances = []
        for u in dist_matrix:
            for v in dist_matrix[u]:
                d = dist_matrix[u][v]
                if d is not None and u != v and d != float('inf'):
                    finite_distances.append(d)
        avg_path_length = (sum(finite_distances) / len(finite_distances)) if finite_distances else 0

        return {
            'totalCities': len(cities),
            'totalRoads': len(roads),
            'degrees': {cid: degree[cid] for cid in degree},
            'degreeDetails': [
                {'id': cid, 'name': cities[cid].name, 'degree': degree[cid]}
                for cid in degree if cid in cities
            ],
            'mostConnected': {
                'id': most_connected,
                'name': cities[most_connected].name if most_connected and most_connected in cities else None,
                'degree': degree.get(most_connected, 0),
            } if most_connected else None,
            'averageEdgeWeight': round(avg_weight, 2),
            'averagePathLength': round(avg_path_length, 2),
            'totalWeight': total_weight,
        }
